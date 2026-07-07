<?php

namespace App\Services;

use App\Models\Numerador;
use App\Models\PedidoOrcamento;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PedidoOrcamentoService
{
    /**
     * Ordem das etapas exibidas na linha do tempo do drawer. Índice usado
     * para saber qual step marcar como concluído/atual a cada transição.
     */
    private const STEP_STATUS = [
        'PENDENTE',
        'COTANDO',
        'AGUARDANDO_APROVACAO_MANUTENCAO',
        'AGUARDANDO_APROVACAO_COMPRA',
        'APROVADO',
        'EM_TRANSITO',
        'CONCLUIDO',
    ];

    private const STEP_TITULOS = [
        'Solicitação criada',
        'Cotação em andamento',
        'Aguardando aprovação da Manutenção',
        'Aguardando aprovação da Compra',
        'Compra aprovada',
        'Em trânsito',
        'Entrega concluída',
    ];

    public function criar(array $dados, User $solicitante): PedidoOrcamento
    {
        return DB::transaction(function () use ($dados, $solicitante) {
            $pedido = PedidoOrcamento::create([
                'numero_sc'      => $dados['numero_sc'] ?? $this->gerarNumero(),
                'data'           => $dados['data'],
                'data_desejada'  => $dados['data_desejada'] ?? null,
                'setor'          => $dados['setor'] ?? 'MANUTENCAO',
                'solicitante_id' => $solicitante->id,
                'destino'        => $dados['destino'],
                'tipo_destino'   => $dados['tipo_destino'],
                'urgencia'       => $dados['urgencia'],
                'itens'          => $dados['itens'],
                'valor_total'    => 0,
                'status'         => 'PENDENTE',
                'timeline'       => $this->timelineInicial($solicitante),
            ]);

            $this->notificar(['op_suprimentos', 'admin_suprimentos'], "Novo pedido de orçamento: {$pedido->numero_sc}");

            return $pedido;
        });
    }

    public function iniciarCotacao(PedidoOrcamento $pedido, User $responsavel): void
    {
        $statusAnterior = $pedido->status;

        $pedido->update([
            'status'        => 'COTANDO',
            'cotado_por_id' => $responsavel->id,
            'data_cotacao'  => now(),
        ]);

        $this->avancarTimeline($pedido, $statusAnterior, $responsavel->nome);
    }

    /**
     * @param array{fornecedores: array<int, array{nome: string, prazo_entrega: ?string, forma_pagamento: ?string}>, itens: array<int, array{descricao: string, precos: array<int, float>}>} $dados
     */
    public function enviarParaAprovacaoManutencao(PedidoOrcamento $pedido, array $dados, User $responsavel): void
    {
        $statusAnterior = $pedido->status;

        $pedido->update([
            'status'               => 'AGUARDANDO_APROVACAO_MANUTENCAO',
            'cotacao_fornecedores' => $dados['fornecedores'],
            'cotacao_itens'        => $dados['itens'],
            'cotado_por_id'        => $responsavel->id,
            'data_cotacao'         => now(),
        ]);

        $this->avancarTimeline($pedido, $statusAnterior, $responsavel->nome);
        $this->notificar(['admin_manutencao'], "Pedido {$pedido->numero_sc} aguardando aprovação da Manutenção.");
    }

    /**
     * A Manutenção escolhe o fornecedor vencedor de CADA item do comparativo
     * (vencedor misto é permitido: item 1 do fornecedor A, item 2 do
     * fornecedor B). Quando o escolhido não é o mais barato daquele item, a
     * justificativa é obrigatória. valor_total é a soma de (preço unitário ×
     * quantidade) de cada item, no fornecedor efetivamente escolhido;
     * fornecedor_escolhido guarda um resumo (nomes únicos dos fornecedores
     * vencedores) para exibição rápida em listagem.
     *
     * @param array<int, array{fornecedor_indice: int, justificativa: ?string}> $escolhas uma entrada por item, na mesma ordem de cotacao_itens
     * @throws \InvalidArgumentException se a quantidade de escolhas não bater com os itens, o índice for inválido, ou faltar justificativa
     */
    public function aprovarManutencao(PedidoOrcamento $pedido, User $aprovador, array $escolhas): void
    {
        $statusAnterior = $pedido->status;
        $itens          = $pedido->cotacao_itens ?? [];
        $fornecedores   = $pedido->cotacao_fornecedores ?? [];

        if (count($escolhas) !== count($itens)) {
            throw new \InvalidArgumentException('É preciso escolher um fornecedor para cada item do comparativo.');
        }

        $valorTotal = 0;
        $nomesEscolhidos = [];
        $itensAtualizados = [];

        foreach ($itens as $i => $item) {
            $indiceEscolhido = $escolhas[$i]['fornecedor_indice'];
            $justificativa   = $escolhas[$i]['justificativa'] ?? null;

            if (! isset($item['fornecedores'][$indiceEscolhido])) {
                throw new \InvalidArgumentException("Fornecedor inválido para o item \"{$item['descricao']}\".");
            }

            $precos = array_column($item['fornecedores'], 'preco');
            $indiceMaisBarato = array_search(min($precos), $precos, true);

            if ($indiceEscolhido !== $indiceMaisBarato && ! $justificativa) {
                throw new \InvalidArgumentException("Justifique a escolha de um fornecedor que não é o mais barato no item \"{$item['descricao']}\".");
            }

            $valorTotal += (float) $item['fornecedores'][$indiceEscolhido]['preco'] * (float) $item['quantidade'];
            $nomesEscolhidos[$fornecedores[$indiceEscolhido]['nome'] ?? ''] = true;

            $itensAtualizados[] = [
                ...$item,
                'fornecedor_escolhido_indice' => $indiceEscolhido,
                'justificativa_escolha'       => $justificativa,
            ];
        }

        $pedido->update([
            'status'                     => 'AGUARDANDO_APROVACAO_COMPRA',
            'aprovado_manutencao_por_id' => $aprovador->id,
            'data_aprovacao_manutencao'  => now(),
            'cotacao_itens'              => $itensAtualizados,
            'fornecedor_escolhido'       => implode(', ', array_keys(array_filter($nomesEscolhidos, fn ($_, $k) => $k !== '', ARRAY_FILTER_USE_BOTH))),
            'valor_total'                => $valorTotal,
        ]);

        $this->avancarTimeline($pedido, $statusAnterior, $aprovador->nome);
        $this->notificar(['admin_suprimentos'], "Pedido {$pedido->numero_sc} aprovado pela Manutenção — aguardando aprovação da compra.");
    }

    public function rejeitar(PedidoOrcamento $pedido, User $responsavel, string $motivo): void
    {
        $statusAnterior = $pedido->status;

        $campos = [
            'status'          => 'REJEITADO',
            'motivo_rejeicao' => $motivo,
        ];

        if ($statusAnterior === 'AGUARDANDO_APROVACAO_MANUTENCAO') {
            $campos['aprovado_manutencao_por_id'] = $responsavel->id;
            $campos['data_aprovacao_manutencao']  = now();
        } else {
            $campos['aprovado_compra_por_id'] = $responsavel->id;
            $campos['data_aprovacao_compra']  = now();
        }

        $pedido->update($campos);

        $this->avancarTimeline($pedido, $statusAnterior, $responsavel->nome, rejeitado: true, motivo: $motivo);
        $this->notificarUsuario($pedido->solicitante_id, "Seu pedido {$pedido->numero_sc} foi rejeitado: {$motivo}");
    }

    public function aprovarCompra(PedidoOrcamento $pedido, User $aprovador): void
    {
        $statusAnterior = $pedido->status;

        $pedido->update([
            'status'                 => 'APROVADO',
            'aprovado_compra_por_id' => $aprovador->id,
            'data_aprovacao_compra'  => now(),
        ]);

        $this->avancarTimeline($pedido, $statusAnterior, $aprovador->nome);
        $this->notificar(['op_suprimentos'], "Pedido {$pedido->numero_sc} com compra aprovada — pronto para compra.");
    }

    /**
     * @throws \InvalidArgumentException se o desconto negociado for maior que o valor total aprovado
     */
    public function registrarCompra(PedidoOrcamento $pedido, array $dados, User $comprador): void
    {
        $statusAnterior = $pedido->status;
        $desconto = (float) ($dados['desconto_negociacao'] ?? 0);

        if ($desconto > (float) $pedido->valor_total) {
            throw new \InvalidArgumentException('O desconto negociado não pode ser maior que o valor total aprovado.');
        }

        $pedido->update([
            'status'                    => 'EM_TRANSITO',
            'comprado_por_id'           => $comprador->id,
            'data_compra'               => now(),
            'data_prevista_recebimento' => $dados['data_prevista_recebimento'],
            'desconto_negociacao'       => $desconto,
        ]);

        $this->avancarTimeline($pedido, $statusAnterior, $comprador->nome);
        $this->notificarUsuario(
            $pedido->solicitante_id,
            "Pedido {$pedido->numero_sc} comprado — previsão de recebimento: {$pedido->data_prevista_recebimento->format('d/m/Y')}."
        );
    }

    public function confirmarRecebimento(PedidoOrcamento $pedido, User $responsavel): void
    {
        $statusAnterior = $pedido->status;

        $pedido->update([
            'status'           => 'CONCLUIDO',
            'recebido_por_id'  => $responsavel->id,
            'data_recebimento' => now(),
        ]);

        $this->avancarTimeline($pedido, $statusAnterior, $responsavel->nome);
        $this->notificar(['op_manutencao', 'admin_manutencao'], "Pedido {$pedido->numero_sc} concluído — material pendente de retirada no Almoxarifado.");
        $this->notificarUsuario($pedido->solicitante_id, "Pedido {$pedido->numero_sc} concluído — material recebido.");
    }

    /**
     * A retirada física por Manutenção é registrada à parte da conclusão da
     * compra (que já aconteceu em confirmarRecebimento) — não é uma nova
     * etapa do status principal, só um marcador de "já veio buscar".
     *
     * @throws \InvalidArgumentException se o pedido não estiver concluído ou já tiver sido retirado
     */
    public function confirmarRetirada(PedidoOrcamento $pedido, User $responsavel): void
    {
        if ($pedido->status !== 'CONCLUIDO') {
            throw new \InvalidArgumentException('Este pedido ainda não está concluído.');
        }
        if ($pedido->retirado_por_id !== null) {
            throw new \InvalidArgumentException('Este pedido já foi retirado.');
        }

        $pedido->update([
            'data_retirada'   => now(),
            'retirado_por_id' => $responsavel->id,
        ]);

        $timeline = $pedido->timeline;
        $ultimo = count($timeline) - 1;
        if ($ultimo >= 0) {
            $timeline[$ultimo]['subtitulo'] = trim(($timeline[$ultimo]['subtitulo'] ?? '') . " — Retirado por: {$responsavel->nome}", ' —');
            $pedido->update(['timeline' => $timeline]);
        }
    }

    private function timelineInicial(User $solicitante): array
    {
        return array_map(fn (string $titulo, int $i) => [
            'titulo'    => $titulo,
            'subtitulo' => $i === 0 ? "{$solicitante->nome} — Manutenção" : '',
            'data'      => $i === 0 ? now()->format('d/m/Y H:i') : null,
            'estado'    => $i === 0 ? 'atual' : 'futuro',
        ], self::STEP_TITULOS, array_keys(self::STEP_TITULOS));
    }

    private function avancarTimeline(
        PedidoOrcamento $pedido,
        string $statusAnterior,
        string $feitoPor,
        bool $rejeitado = false,
        ?string $motivo = null,
    ): void {
        $stepAtual = array_search($statusAnterior, self::STEP_STATUS, true);
        $stepNovo  = array_search($pedido->status, self::STEP_STATUS, true);
        $agora     = now()->format('d/m/Y H:i');

        $timeline = collect($pedido->timeline)->map(function (array $step, int $i) use ($stepAtual, $stepNovo, $rejeitado, $motivo, $feitoPor, $agora) {
            if ($stepAtual !== false && $i < $stepAtual) {
                return $step;
            }
            if ($stepAtual !== false && $i === $stepAtual) {
                if ($rejeitado) {
                    return [...$step, 'estado' => 'rejeitado', 'data' => $agora, 'subtitulo' => "Rejeitado por: {$feitoPor}" . ($motivo ? " — {$motivo}" : '')];
                }
                return [...$step, 'estado' => 'concluido', 'data' => $step['data'] ?? $agora];
            }
            if (! $rejeitado && $stepNovo !== false && $i === $stepNovo) {
                return [...$step, 'estado' => 'atual', 'data' => $agora, 'subtitulo' => $step['subtitulo'] ?: $feitoPor];
            }
            return $step;
        })->all();

        $pedido->update(['timeline' => $timeline]);
    }

    private function gerarNumero(): string
    {
        $ano   = date('Y');
        $chave = "SC-ORC-{$ano}";

        $numerador = Numerador::lockForUpdate()->firstOrCreate(
            ['chave' => $chave],
            ['ultimo' => 0]
        );

        $numerador->increment('ultimo');
        $numerador->refresh();

        return sprintf('%s-%04d', $chave, $numerador->ultimo);
    }

    private function notificar(array $papeis, string $mensagem): void
    {
        $usuarios = User::whereIn('papel', $papeis)->where('ativo', true)->get();
        foreach ($usuarios as $usuario) {
            Log::info("[NOTIF] → {$usuario->nome} ({$usuario->papel}): {$mensagem}");
        }
    }

    private function notificarUsuario(int $userId, string $mensagem): void
    {
        $usuario = User::find($userId);
        if ($usuario) {
            Log::info("[NOTIF] → {$usuario->nome}: {$mensagem}");
        }
    }
}
