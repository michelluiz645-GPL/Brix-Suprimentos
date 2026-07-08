<?php

namespace App\Services;

use App\Models\Movimento;
use App\Models\Numerador;
use App\Models\ProdutoVariacao;
use App\Models\User;

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

        foreach ($dados['itens'] as $i => $item) {
            $variacoes[$i]->decrement('estoque', $item['qtd']);

            Movimento::create([
                'numero_pedido'       => $numeroPedido,
                'tipo'                => 'SAÍDA',
                'tipo_saida'          => $dados['tipo_saida'],
                'codigo'              => $item['codigo'],
                'produto_variacao_id' => $variacoes[$i]->id,
                'nome'                => $item['nome'] ?: $variacoes[$i]->produto?->nome ?? '',
                'unid'                => $item['unid'] ?? '',
                'qtd'                 => $item['qtd'],
                'preco'               => $item['preco'] ?? $variacoes[$i]->preco,
                'obs'                 => $item['obs'] ?? null,
                'almoxarifado'        => $dados['almoxarifado'],
                'responsavel'         => $dados['resp_almox'],
                'data'                => $dados['data'],
                'usuario'             => $usuario->nome,
                'equipe'              => $dados['equipe'],
                'nome_equipe'         => $dados['equipe'],
                'colaborador'         => $dados['colaborador'] ?? null,
                'entregador'          => $dados['entregador'],
                'status'              => 'ATIVO',
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
}
