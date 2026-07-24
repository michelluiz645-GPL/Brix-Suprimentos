<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AtualizarProdutoRequest;
use App\Http\Requests\CriarProdutoRequest;
use App\Models\Produto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProdutoController extends Controller
{
    public function index(): JsonResponse
    {
        $produtos = Produto::with('variacoes')->orderBy('nome')->get()->map(fn ($p) => $this->serialize($p));

        // O frontend filtra/busca no cliente sobre a lista inteira, mas espera
        // o formato de paginador do Laravel (data.data) — por isso o shape
        // manual abaixo, sem limitar de fato a quantidade retornada.
        return response()->json([
            'data' => [
                'data'         => $produtos,
                'current_page' => 1,
                'last_page'    => 1,
                'per_page'     => $produtos->count(),
                'total'        => $produtos->count(),
            ],
            'message' => 'OK',
        ]);
    }

    public function show(string $identificador): JsonResponse
    {
        $produto = $this->localizar($identificador);

        return response()->json(['data' => $this->serialize($produto), 'message' => 'OK']);
    }

    public function store(CriarProdutoRequest $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return $this->erroSomenteAdmin();
        }

        $dados = $request->validated();
        $variacoes = $dados['variacoes'];
        unset($dados['variacoes']);

        $produto = Produto::create([...$dados, 'status' => $dados['status'] ?? 'ATIVO']);
        foreach ($variacoes as $variacao) {
            $produto->variacoes()->create([...$variacao, 'status' => $variacao['status'] ?? 'ATIVO']);
        }

        return response()->json(['data' => $this->serialize($produto->fresh('variacoes')), 'message' => 'Produto cadastrado com sucesso.'], 201);
    }

    public function update(AtualizarProdutoRequest $request, string $identificador): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return $this->erroSomenteAdmin();
        }

        $produto = $this->localizar($identificador);
        $dados = $request->validated();

        if (array_key_exists('variacoes', $dados)) {
            $this->sincronizarVariacoes($produto, $dados['variacoes']);
            unset($dados['variacoes']);
        }

        $produto->update($dados);

        return response()->json(['data' => $this->serialize($produto->fresh('variacoes')), 'message' => 'Produto atualizado com sucesso.']);
    }

    public function destroy(Request $request, string $identificador): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return $this->erroSomenteAdmin();
        }

        $this->localizar($identificador)->delete();

        return response()->json(['data' => null, 'message' => 'Produto removido com sucesso.']);
    }

    /**
     * Atualiza/cria pelo id enviado, remove quem ficou de fora do payload —
     * preserva os ids das variações que continuam existindo, já que futuras
     * movimentações de estoque (entrada/saída) vão referenciar variacao_id.
     */
    private function sincronizarVariacoes(Produto $produto, array $variacoes): void
    {
        $idsEnviados = [];

        foreach ($variacoes as $dados) {
            $id = $dados['id'] ?? null;
            unset($dados['id']);
            $dados['status'] = $dados['status'] ?? 'ATIVO';

            if ($id && ($variacao = $produto->variacoes()->find($id))) {
                $variacao->update($dados);
                $idsEnviados[] = $variacao->id;
            } else {
                $idsEnviados[] = $produto->variacoes()->create($dados)->id;
            }
        }

        $produto->variacoes()->whereNotIn('id', $idsEnviados)->delete();
    }

    /**
     * O frontend usa ora o id numérico (Inventário), ora o codigo_produto
     * (Fichas de Produtos) como identificador nas rotas de show/update/destroy.
     */
    private function localizar(string $identificador): Produto
    {
        return Produto::with('variacoes')
            ->where('id', $identificador)
            ->orWhere('codigo_produto', $identificador)
            ->firstOrFail();
    }

    /**
     * Agrega os totais das variações (marcas) só para fins de exibição —
     * estoque crítico e valor de estoque somam apenas variações ATIVAS.
     */
    private function serialize(Produto $produto): array
    {
        $ativas = $produto->variacoes->where('status', 'ATIVO');

        return [
            'id'                => $produto->id,
            'codigo_produto'    => $produto->codigo_produto,
            'nome'              => $produto->nome,
            'categoria'         => $produto->categoria,
            'unid'              => $produto->unid,
            'estoque_min'       => (float) $produto->estoque_min,
            'estoque_max'       => (float) $produto->estoque_max,
            'armario'           => $produto->armario,
            'prateleira'        => $produto->prateleira,
            'dias_validade_epi' => $produto->dias_validade_epi,
            'marca_obrigatoria' => (bool) $produto->marca_obrigatoria,
            'status'            => $produto->status,
            'variacoes'         => $produto->variacoes->map(fn ($v) => [
                'id'                => $v->id,
                'marca'             => $v->marca,
                'codigo_fabricante' => $v->codigo_fabricante,
                'preco'             => (float) $v->preco,
                'estoque'           => (float) $v->estoque,
                'status'            => $v->status,
            ])->values(),
            'estoque_total' => (float) $ativas->sum('estoque'),
            'valor_total'   => (float) $ativas->reduce(fn ($acc, $v) => $acc + ($v->preco * $v->estoque), 0),
            'preco_min'     => $ativas->isEmpty() ? 0 : (float) $ativas->min('preco'),
            'preco_max'     => $ativas->isEmpty() ? 0 : (float) $ativas->max('preco'),
        ];
    }

    private function erroSomenteAdmin(): JsonResponse
    {
        return response()->json([
            'data'    => null,
            'message' => 'Somente administradores podem criar, editar ou inativar produtos.',
        ], 403);
    }
}
