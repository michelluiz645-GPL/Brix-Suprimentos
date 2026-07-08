<?php

namespace App\Services;

use App\Models\Movimento;
use App\Models\Numerador;
use App\Models\ProdutoVariacao;
use App\Models\User;

class DevolucaoService
{
    /**
     * @throws \InvalidArgumentException se o pedido de origem não existir ou a
     *                                     quantidade devolvida exceder a saída original
     */
    public function criar(array $dados, User $usuario): string
    {
        $itensOrigem = Movimento::where('numero_pedido', $dados['numero_pedido_origem'])
            ->where('tipo', 'SAÍDA')
            ->get();

        if ($itensOrigem->isEmpty()) {
            throw new \InvalidArgumentException('Pedido de saída de origem não encontrado.');
        }

        foreach ($dados['itens'] as $item) {
            $origem = $itensOrigem->firstWhere('codigo', $item['codigo']);
            if (! $origem) {
                throw new \InvalidArgumentException("O item \"{$item['nome']}\" não pertence ao pedido de origem informado.");
            }
            if ($item['qtd_dev'] > $origem->qtd) {
                throw new \InvalidArgumentException("\"{$item['nome']}\" — quantidade devolvida ({$item['qtd_dev']}) maior que a quantidade original ({$origem->qtd}).");
            }
        }

        $numeroPedido = $this->gerarNumero();

        foreach ($dados['itens'] as $item) {
            $danificado = $item['danificado'] ?? false;
            $variacao = ! empty($item['variacao_id']) ? ProdutoVariacao::find($item['variacao_id']) : null;

            // Item danificado não retorna ao estoque (RF-008)
            if (! $danificado && $variacao) {
                $variacao->increment('estoque', $item['qtd_dev']);
            }

            Movimento::create([
                'numero_pedido'         => $numeroPedido,
                'numero_pedido_origem'  => $dados['numero_pedido_origem'],
                'tipo'                  => 'DEVOLUÇÃO',
                'codigo'                => $item['codigo'],
                'produto_variacao_id'   => $variacao?->id,
                'nome'                  => $item['nome'] ?: ($variacao?->produto?->nome ?? ''),
                'unid'                  => $item['unid'] ?? '',
                'qtd'                   => $item['qtd_dev'],
                'preco'                 => $variacao?->preco ?? 0,
                'obs'                   => $dados['motivo'],
                'almoxarifado'          => $itensOrigem->first()->almoxarifado,
                'responsavel'           => $dados['responsavel'],
                'data'                  => $dados['data'],
                'usuario'               => $usuario->nome,
                'danificado'            => $danificado,
            ]);
        }

        return $numeroPedido;
    }

    private function gerarNumero(): string
    {
        $ano   = date('Y');
        $chave = "MOV-DEVOLUÇÃO-{$ano}";

        $numerador = Numerador::lockForUpdate()->firstOrCreate(
            ['chave' => $chave],
            ['ultimo' => 0]
        );

        $numerador->increment('ultimo');
        $numerador->refresh();

        return sprintf('%s-%04d', $chave, $numerador->ultimo);
    }
}
