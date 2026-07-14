<?php

namespace App\Services;

use App\Models\DebitoManutencao;
use App\Models\EpiRegistro;
use App\Models\Equipe;
use App\Models\Movimento;
use App\Models\Numerador;
use App\Models\ProdutoVariacao;
use App\Models\User;
use Carbon\Carbon;

class SaidaService
{
    /**
     * @throws \InvalidArgumentException se algum item não tiver estoque suficiente
     */
    public function criar(array $dados, User $usuario): string
    {
        // Valida estoque de todos os itens antes de baixar qualquer um —
        // evita baixar parcialmente um cupom que vai falhar no meio.
        $variacoes = [];
        foreach ($dados['itens'] as $item) {
            $variacao = ProdutoVariacao::find($item['variacao_id']);
            if (! $variacao) {
                throw new \InvalidArgumentException("Marca/variação inválida para o item \"{$item['nome']}\".");
            }
            if ($variacao->estoque < $item['qtd']) {
                throw new \InvalidArgumentException("\"{$item['nome']}\" — quantidade solicitada ({$item['qtd']}) maior que o estoque disponível ({$variacao->estoque}).");
            }
            $variacoes[] = $variacao;
        }

        $numeroPedido = $this->gerarNumero();

        // RF-025 — equipe do tipo Manutenção também gera débito automático,
        // além de qualquer item cujo destino seja Frota ou Manutenção.
        $equipeManutencao = Equipe::where('numero', $dados['equipe'])->value('tipo') === 'Manutenção';
        $itensDebito = [];

        foreach ($dados['itens'] as $i => $item) {
            $variacoes[$i]->decrement('estoque', $item['qtd']);

            $produto = $variacoes[$i]->produto;
            $isEpi   = $produto?->categoria === 'EPI';
            $nomeItem = $item['nome'] ?: $produto?->nome ?? '';

            // RF-006/RF-023 — para EPI, a validade conta a partir da data da
            // saída (não da entrada), usando os dias cadastrados na ficha do produto.
            $epiVencimento = $isEpi && $produto->dias_validade_epi
                ? Carbon::parse($dados['data'])->addDays($produto->dias_validade_epi)
                : null;

            Movimento::create([
                'numero_pedido'       => $numeroPedido,
                'tipo'                => 'SAÍDA',
                'tipo_saida'          => $dados['tipo_saida'],
                'codigo'              => $item['codigo'],
                'produto_variacao_id' => $variacoes[$i]->id,
                'nome'                => $nomeItem,
                'unid'                => $item['unid'] ?? '',
                'qtd'                 => $item['qtd'],
                'preco'               => $item['preco'] ?? $variacoes[$i]->preco,
                'obs'                 => $item['obs'] ?? null,
                'destino'             => $item['destino'],
                'destino_frota'       => $item['destino_frota'] ?? null,
                'almoxarifado'        => $dados['almoxarifado'],
                'responsavel'         => $dados['resp_almox'],
                'data'                => $dados['data'],
                'usuario'             => $usuario->nome,
                'equipe'              => $dados['equipe'],
                'nome_equipe'         => $dados['nome_equipe'] ?? $dados['equipe'],
                'colaborador'         => $dados['colaborador'] ?? null,
                'colaborador_epi'     => $isEpi ? ($item['colaborador_epi'] ?? null) : null,
                'epi_vencimento'      => $epiVencimento,
                'entregador'          => $dados['entregador'],
                'status'              => 'ATIVO',
            ]);

            if ($isEpi && ! empty($item['colaborador_epi']) && $epiVencimento) {
                EpiRegistro::create([
                    'funcionario'    => $item['colaborador_epi'],
                    'epi'            => $nomeItem,
                    'data_entrega'   => $dados['data'],
                    'proxima_troca'  => $epiVencimento,
                    'responsavel'    => $dados['resp_almox'],
                    'registrado_por' => $usuario->nome,
                ]);
            }

            // EPI nunca entra no débito, mesmo saindo pra frota/manutenção.
            $geraDebito = ! $isEpi && ($item['destino'] === 'Frota' || $item['destino'] === 'Manutenção' || $equipeManutencao);
            if ($geraDebito) {
                $itensDebito[] = [
                    'nome' => $nomeItem, 'qtd' => $item['qtd'], 'unid' => $item['unid'] ?? '',
                    'preco' => (float) ($item['preco'] ?? $variacoes[$i]->preco),
                    'destino_frota' => $item['destino_frota'] ?? null,
                ];
            }
        }

        if (! empty($itensDebito)) {
            DebitoManutencao::create([
                'numero'         => $this->gerarNumeroDebito(),
                'pedido_origem'  => $numeroPedido,
                'data'           => $dados['data'],
                'equipe'         => $dados['equipe'],
                'nome_equipe'    => $dados['nome_equipe'] ?? $dados['equipe'],
                'colaborador'    => $dados['colaborador'] ?? null,
                'almoxarifado'   => $dados['almoxarifado'],
                'registrado_por' => $usuario->nome,
                'itens'          => $itensDebito,
                'total'          => collect($itensDebito)->sum(fn ($i) => $i['qtd'] * $i['preco']),
                'status'         => 'ABERTO',
            ]);
        }

        return $numeroPedido;
    }

    /**
     * @throws \InvalidArgumentException se o cupom não existir ou já estiver cancelado
     */
    public function cancelar(string $numeroPedido): void
    {
        $itens = Movimento::where('numero_pedido', $numeroPedido)->where('tipo', 'SAÍDA')->get();
        if ($itens->isEmpty()) {
            throw new \InvalidArgumentException('Cupom não encontrado.');
        }
        if ($itens->first()->status === 'CANCELADO') {
            throw new \InvalidArgumentException('Este cupom já foi cancelado.');
        }

        foreach ($itens as $item) {
            $item->produtoVariacao?->increment('estoque', $item->qtd);
            $item->update(['status' => 'CANCELADO']);
        }
    }

    private function gerarNumero(): string
    {
        $ano   = date('Y');
        $chave = "MOV-SAÍDA-{$ano}";

        $numerador = Numerador::lockForUpdate()->firstOrCreate(
            ['chave' => $chave],
            ['ultimo' => 0]
        );

        $numerador->increment('ultimo');
        $numerador->refresh();

        return sprintf('%s-%04d', $chave, $numerador->ultimo);
    }

    private function gerarNumeroDebito(): string
    {
        $ano   = date('Y');
        $chave = "DEB-{$ano}";

        $numerador = Numerador::lockForUpdate()->firstOrCreate(
            ['chave' => $chave],
            ['ultimo' => 0]
        );

        $numerador->increment('ultimo');
        $numerador->refresh();

        return sprintf('%s-%04d', $chave, $numerador->ultimo);
    }
}
