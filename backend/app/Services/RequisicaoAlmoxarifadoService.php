<?php

namespace App\Services;

use App\Models\Numerador;
use App\Models\ProdutoVariacao;
use App\Models\RequisicaoAlmoxarifado;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class RequisicaoAlmoxarifadoService
{
    public function __construct(private SaidaService $saidaService) {}

    public function criar(array $dados, User $solicitante): RequisicaoAlmoxarifado
    {
        return DB::transaction(function () use ($dados, $solicitante) {
            $requisicao = RequisicaoAlmoxarifado::create([
                'numero'         => $this->gerarNumero(),
                'solicitante_id' => $solicitante->id,
                'setor'          => $solicitante->setor?->codigo,
                'data'           => $dados['data'],
                'data_desejada'  => $dados['data_desejada'],
                'urgencia'       => $dados['urgencia'] ?? 'Média',
                'justificativa'  => $dados['justificativa'] ?? null,
                'status'         => 'PENDENTE',
            ]);

            foreach ($dados['itens'] as $item) {
                $requisicao->itens()->create([
                    'produto_id'           => $item['produto_id'],
                    'produto_variacao_id'  => $item['produto_variacao_id'] ?? null,
                    'quantidade'           => $item['quantidade'],
                    'destino'              => $item['destino'],
                    'destino_equipe'       => $item['destino_equipe'] ?? null,
                    'destino_frota'        => $item['destino_frota'] ?? null,
                    'destino_obra'         => $item['destino_obra'] ?? null,
                    'colaborador_epi'      => $item['colaborador_epi'] ?? null,
                    'observacao'           => $item['observacao'] ?? null,
                ]);
            }

            return $requisicao->fresh('itens');
        });
    }

    /**
     * @throws \InvalidArgumentException se algum item não tiver saldo disponível
     */
    public function aprovar(RequisicaoAlmoxarifado $requisicao, User $aprovador): void
    {
        if ($requisicao->status !== 'PENDENTE') {
            throw new \InvalidArgumentException('Esta requisição não está mais pendente.');
        }

        DB::transaction(function () use ($requisicao, $aprovador) {
            $requisicao->loadMissing('itens.produto');

            foreach ($requisicao->itens as $item) {
                if ($item->produto_variacao_id) {
                    $variacao = ProdutoVariacao::where('id', $item->produto_variacao_id)->lockForUpdate()->first();
                    $reservado = $this->reservadoVariacao($item->produto_variacao_id);
                    $disponivel = (float) $variacao->estoque - $reservado;
                } else {
                    $variacoesAtivas = ProdutoVariacao::where('produto_id', $item->produto_id)
                        ->where('status', 'ATIVO')->lockForUpdate()->get();
                    $reservado = $this->reservadoProduto($item->produto_id);
                    $disponivel = (float) $variacoesAtivas->sum('estoque') - $reservado;
                }

                if ($item->quantidade > $disponivel) {
                    throw new \InvalidArgumentException(
                        "\"{$item->produto->nome}\" — quantidade solicitada ({$item->quantidade}) maior que o saldo disponível ({$disponivel})."
                    );
                }
            }

            $requisicao->update([
                'status'           => 'APROVADA',
                'aprovado_por_id'  => $aprovador->id,
                'data_aprovacao'   => now(),
            ]);
        });
    }

    public function rejeitar(RequisicaoAlmoxarifado $requisicao, User $rejeitador, string $motivo): void
    {
        if ($requisicao->status !== 'PENDENTE') {
            throw new \InvalidArgumentException('Esta requisição não está mais pendente.');
        }

        $requisicao->update([
            'status'          => 'REJEITADA',
            'rejeitado_por_id'=> $rejeitador->id,
            'data_rejeicao'   => now(),
            'motivo_rejeicao' => $motivo,
        ]);
    }

    public function cancelar(RequisicaoAlmoxarifado $requisicao, User $cancelador, string $motivo): void
    {
        if (! in_array($requisicao->status, ['PENDENTE', 'APROVADA'], true)) {
            throw new \InvalidArgumentException('Esta requisição não pode mais ser cancelada.');
        }

        $requisicao->update([
            'status'              => 'CANCELADA',
            'cancelado_por_id'    => $cancelador->id,
            'data_cancelamento'   => now(),
            'motivo_cancelamento' => $motivo,
        ]);
    }

    /**
     * Converte os itens marcados "separar" numa Saída de verdade — reaproveita
     * 100% da validação/baixa de estoque, EPI e débito automático de
     * SaidaService::criar(), garantindo a mesma sequência de cupons. Itens
     * marcados "indisponivel" (não vamos ter) encerram sem debitar nada.
     * Itens omitidos ficam PENDENTE — dá pra separar em mais de uma rodada,
     * a requisição só vira CONCLUIDA quando não sobra nenhum PENDENTE.
     *
     * @throws \InvalidArgumentException se faltar marca escolhida, estoque insuficiente,
     *         ou nenhum item elegível for enviado
     */
    public function confirmarSeparacao(RequisicaoAlmoxarifado $requisicao, array $dados, User $almoxarife): void
    {
        if ($requisicao->status !== 'APROVADA') {
            throw new \InvalidArgumentException('Esta requisição precisa estar aprovada para ser separada.');
        }

        DB::transaction(function () use ($requisicao, $dados, $almoxarife) {
            $requisicao->loadMissing(['itens' => fn ($q) => $q->where('status', 'PENDENTE'), 'itens.produto', 'solicitante']);
            $acoes = collect($dados['itens'] ?? [])->keyBy('item_id');

            $itensParaSeparar = $requisicao->itens->filter(
                fn ($item) => ($acoes[$item->id]['acao'] ?? null) === 'separar'
            );
            $itensIndisponiveis = $requisicao->itens->filter(
                fn ($item) => ($acoes[$item->id]['acao'] ?? null) === 'indisponivel'
            );

            if ($itensParaSeparar->isEmpty() && $itensIndisponiveis->isEmpty()) {
                throw new \InvalidArgumentException('Nenhum item pendente foi selecionado.');
            }

            foreach ($itensIndisponiveis as $item) {
                $item->update(['status' => 'INDISPONIVEL']);
            }

            $numeroPedido = null;

            if ($itensParaSeparar->isNotEmpty()) {
                $variacaoIdPorItem = [];
                foreach ($itensParaSeparar as $item) {
                    $variacaoId = $item->produto_variacao_id ?? ($acoes[$item->id]['produto_variacao_id'] ?? null);

                    // Se o item não veio com marca escolhida e o produto só tem uma
                    // variação ativa, não há decisão real a tomar — usa ela direto,
                    // sem obrigar o Almoxarife a confirmar o óbvio.
                    if (! $variacaoId) {
                        $variacoesAtivas = $item->produto->variacoes()->where('status', 'ATIVO')->get();
                        if ($variacoesAtivas->count() === 1) {
                            $variacaoId = $variacoesAtivas->first()->id;
                        }
                    }

                    if (! $variacaoId) {
                        throw new \InvalidArgumentException("Selecione a marca para o item \"{$item->produto->nome}\" antes de confirmar a separação.");
                    }
                    $variacaoIdPorItem[$item->id] = $variacaoId;
                }

                // Lock nas variações envolvidas ANTES de chamar o SaidaService, que
                // não abre transação própria — evita duas separações concorrentes
                // decidirem com base no mesmo saldo desatualizado.
                $variacoesLocked = ProdutoVariacao::whereIn('id', array_unique(array_values($variacaoIdPorItem)))
                    ->lockForUpdate()->get()->keyBy('id');

                $itensParaSaida = [];
                foreach ($itensParaSeparar as $item) {
                    $variacaoId = $variacaoIdPorItem[$item->id];
                    $variacao   = $variacoesLocked[$variacaoId];

                    $itensParaSaida[] = [
                        'codigo'          => $item->produto->codigo_produto,
                        'variacao_id'     => $variacaoId,
                        'nome'            => $variacao->marca ? "{$item->produto->nome} - {$variacao->marca}" : $item->produto->nome,
                        'unid'            => $item->produto->unid,
                        'qtd'             => (float) $item->quantidade,
                        'preco'           => (float) $variacao->preco,
                        'destino'         => $item->destino,
                        'destino_frota'   => $item->destino_frota,
                        'destino_obra'    => $item->destino_obra,
                        'colaborador_epi' => $item->colaborador_epi,
                    ];
                }

                $numeroPedido = $this->saidaService->criar([
                    'tipo_saida'   => 'Retirada',
                    'equipe'       => $requisicao->numero,
                    'nome_equipe'  => $requisicao->numero,
                    'colaborador'  => $requisicao->solicitante->nome,
                    'entregador'   => $dados['entregador'],
                    'resp_almox'   => $dados['resp_almox'],
                    'almoxarifado' => $dados['almoxarifado'],
                    'data'         => now()->format('Y-m-d'),
                    'itens'        => $itensParaSaida,
                ], $almoxarife);

                foreach ($itensParaSeparar as $item) {
                    $item->update([
                        'status'              => 'SEPARADO',
                        'produto_variacao_id' => $variacaoIdPorItem[$item->id],
                        'numero_pedido_saida'  => $numeroPedido,
                    ]);
                }
            }

            $aindaPendente = $requisicao->itens()->where('status', 'PENDENTE')->exists();

            if (! $aindaPendente) {
                $requisicao->update([
                    'status'              => 'CONCLUIDA',
                    'separado_por_id'     => $almoxarife->id,
                    'data_separacao'      => now(),
                    'numero_pedido_saida' => $numeroPedido ?? $requisicao->numero_pedido_saida,
                ]);
            } elseif ($numeroPedido) {
                $requisicao->update(['numero_pedido_saida' => $numeroPedido]);
            }
        });
    }

    /**
     * Saldo "reservado" por requisições já APROVADAS mas ainda não separadas,
     * agrupado por variação (itens com marca já escolhida) — usado pela tela
     * de novo pedido/aprovação. Calculado na hora, sem contador armazenado:
     * uma requisição some dessa soma automaticamente assim que muda de
     * status (rejeitada/cancelada/concluída), sem risco de ficar desatualizado.
     */
    public function reservadoPorVariacaoBulk(): array
    {
        return DB::table('itens_requisicao_almoxarifado as i')
            ->join('requisicoes_almoxarifado as r', 'r.id', '=', 'i.requisicao_id')
            ->where('r.status', 'APROVADA')
            ->where('i.status', 'PENDENTE')
            ->whereNotNull('i.produto_variacao_id')
            ->groupBy('i.produto_variacao_id')
            ->selectRaw('i.produto_variacao_id as pid, SUM(i.quantidade) as total')
            ->pluck('total', 'pid')
            ->map(fn ($v) => (float) $v)
            ->all();
    }

    /**
     * Mesma ideia, mas para itens ainda sem marca escolhida (marca livre) —
     * a reserva é contra o produto genérico, não uma variação específica.
     */
    public function reservadoPorProdutoBulk(): array
    {
        return DB::table('itens_requisicao_almoxarifado as i')
            ->join('requisicoes_almoxarifado as r', 'r.id', '=', 'i.requisicao_id')
            ->where('r.status', 'APROVADA')
            ->where('i.status', 'PENDENTE')
            ->whereNull('i.produto_variacao_id')
            ->groupBy('i.produto_id')
            ->selectRaw('i.produto_id as pid, SUM(i.quantidade) as total')
            ->pluck('total', 'pid')
            ->map(fn ($v) => (float) $v)
            ->all();
    }

    private function reservadoVariacao(int $variacaoId): float
    {
        return (float) DB::table('itens_requisicao_almoxarifado as i')
            ->join('requisicoes_almoxarifado as r', 'r.id', '=', 'i.requisicao_id')
            ->where('r.status', 'APROVADA')
            ->where('i.status', 'PENDENTE')
            ->where('i.produto_variacao_id', $variacaoId)
            ->sum('i.quantidade');
    }

    private function reservadoProduto(int $produtoId): float
    {
        return (float) DB::table('itens_requisicao_almoxarifado as i')
            ->join('requisicoes_almoxarifado as r', 'r.id', '=', 'i.requisicao_id')
            ->where('r.status', 'APROVADA')
            ->where('i.status', 'PENDENTE')
            ->whereNull('i.produto_variacao_id')
            ->where('i.produto_id', $produtoId)
            ->sum('i.quantidade');
    }

    private function gerarNumero(): string
    {
        $ano   = date('Y');
        $chave = "REQ-ALM-{$ano}";

        $numerador = Numerador::lockForUpdate()->firstOrCreate(
            ['chave' => $chave],
            ['ultimo' => 0]
        );

        $numerador->increment('ultimo');
        $numerador->refresh();

        return sprintf('%s-%04d', $chave, $numerador->ultimo);
    }
}
