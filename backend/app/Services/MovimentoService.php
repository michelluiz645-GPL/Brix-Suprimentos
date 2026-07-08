<?php

namespace App\Services;

use App\Models\Movimento;
use App\Models\Numerador;
use App\Models\ProdutoVariacao;
use App\Models\User;

class MovimentoService
{
    /**
     * Aceita duas formas de payload: em lote (Registrar Entrada, uma NF com
     * vários itens — chave "itens") ou avulsa (Inventário/Ajuste, um item só
     * direto no corpo da requisição). Cada item vira uma linha no ledger,
     * todas compartilhando o mesmo número de pedido gerado aqui.
     *
     * @throws \InvalidArgumentException se faltar variação em item de ENTRADA
     */
    public function criar(array $dados, User $usuario): array
    {
        $itens = $dados['itens'] ?? [[
            'codigo'      => $dados['codigo'],
            'variacao_id' => $dados['variacao_id'] ?? null,
            'nome'        => $dados['nome'] ?? '',
            'unid'        => $dados['unid'] ?? '',
            'qtd'         => $dados['qtd'],
            'preco'       => $dados['preco'] ?? 0,
        ]];

        $numeroPedido = $this->gerarNumero($dados['tipo']);
        $registros = [];

        foreach ($itens as $item) {
            $variacao = ! empty($item['variacao_id']) ? ProdutoVariacao::find($item['variacao_id']) : null;

            if ($dados['tipo'] === 'ENTRADA') {
                if (! $variacao) {
                    throw new \InvalidArgumentException("Selecione a marca/variação do item \"{$item['nome']}\".");
                }
                // RF-005: confirmação de entrada atualiza estoque e preço do produto
                $variacao->increment('estoque', $item['qtd']);
                $variacao->update(['preco' => $item['preco'] ?? $variacao->preco]);
            }
            // AJUSTE (Inventário) não mexe em estoque aqui — a tela já ajusta a
            // variação diretamente via PUT /produtos; esta linha é só o registro
            // no ledger para fins de auditoria/relatório.

            $registros[] = Movimento::create([
                'numero_pedido'       => $numeroPedido,
                'tipo'                => $dados['tipo'],
                'numero_nf'           => $dados['numero_nf'] ?? null,
                'codigo'              => $item['codigo'],
                'produto_variacao_id' => $variacao?->id,
                'nome'                => $item['nome'] ?: ($variacao?->produto?->nome ?? ''),
                'unid'                => $item['unid'] ?: ($variacao?->produto?->unid ?? ''),
                'qtd'                 => $item['qtd'],
                'preco'               => $item['preco'] ?? 0,
                'fornecedor'          => $dados['fornecedor'] ?? null,
                'obs'                 => $dados['obs'] ?? null,
                'almoxarifado'        => $dados['almoxarifado'],
                'responsavel'         => $dados['responsavel'] ?? null,
                'data'                => $dados['data'],
                'usuario'             => $dados['usuario'] ?? $usuario->nome,
            ]);
        }

        return ['numero_pedido' => $numeroPedido, 'registros' => $registros];
    }

    private function gerarNumero(string $tipo): string
    {
        $ano   = date('Y');
        $chave = "MOV-{$tipo}-{$ano}";

        $numerador = Numerador::lockForUpdate()->firstOrCreate(
            ['chave' => $chave],
            ['ultimo' => 0]
        );

        $numerador->increment('ultimo');
        $numerador->refresh();

        return sprintf('%s-%04d', $chave, $numerador->ultimo);
    }
}
