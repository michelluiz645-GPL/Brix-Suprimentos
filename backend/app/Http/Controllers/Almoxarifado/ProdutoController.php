<?php

namespace App\Http\Controllers\Almoxarifado;

use App\Http\Controllers\Controller;
use App\Models\Produto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProdutoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Produto::query();

        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(fn ($w) =>
                $w->where('nome', 'like', "%{$q}%")
                  ->orWhere('codigo_produto', 'like', "%{$q}%")
                  ->orWhere('categoria', 'like', "%{$q}%")
            );
        }

        if ($request->filled('categoria')) {
            $query->where('categoria', $request->categoria);
        }

        if (! $request->boolean('incluir_inativos')) {
            $query->where('status', 'ATIVO');
        }

        return response()->json([
            'data' => $query->orderBy('nome')->paginate(50),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'codigo_produto'    => 'required|string|unique:produtos',
            'nome'              => 'required|string|max:255',
            'categoria'         => 'required|string|max:100',
            'unid'              => 'required|string|max:20',
            'preco'             => 'required|numeric|min:0',
            'estoque'           => 'required|numeric|min:0',
            'estoque_min'       => 'nullable|numeric|min:0',
            'estoque_max'       => 'nullable|numeric|min:0',
            'armario'           => 'nullable|string|max:50',
            'prateleira'        => 'nullable|string|max:50',
            'dias_validade_epi' => 'nullable|integer|min:0',
        ]);

        $produto = Produto::create(array_merge($data, ['status' => 'ATIVO']));

        return response()->json([
            'data'    => $produto,
            'message' => 'Produto cadastrado com sucesso.',
        ], 201);
    }

    public function show(Produto $produto): JsonResponse
    {
        return response()->json(['data' => $produto]);
    }

    public function update(Request $request, Produto $produto): JsonResponse
    {
        $data = $request->validate([
            'codigo_produto'    => 'sometimes|string|unique:produtos,codigo_produto,' . $produto->id,
            'nome'              => 'sometimes|string|max:255',
            'categoria'         => 'sometimes|string|max:100',
            'unid'              => 'sometimes|string|max:20',
            'preco'             => 'sometimes|numeric|min:0',
            'estoque_min'       => 'nullable|numeric|min:0',
            'estoque_max'       => 'nullable|numeric|min:0',
            'armario'           => 'nullable|string|max:50',
            'prateleira'        => 'nullable|string|max:50',
            'status'            => 'sometimes|in:ATIVO,INATIVO',
            'dias_validade_epi' => 'nullable|integer|min:0',
        ]);

        $produto->update($data);

        return response()->json([
            'data'    => $produto,
            'message' => 'Produto atualizado com sucesso.',
        ]);
    }

    public function destroy(Produto $produto): JsonResponse
    {
        $produto->update(['status' => 'INATIVO']);
        $produto->delete();

        return response()->json([
            'message' => 'Produto inativado com sucesso.',
        ]);
    }
}
