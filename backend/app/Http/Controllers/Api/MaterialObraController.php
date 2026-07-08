<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AtualizarMaterialObraRequest;
use App\Http\Requests\CriarMaterialObraRequest;
use App\Models\MaterialObra;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaterialObraController extends Controller
{
    public function index(): JsonResponse
    {
        $materiais = MaterialObra::orderBy('nome')->get();

        return response()->json([
            'data' => [
                'data'         => $materiais,
                'current_page' => 1,
                'last_page'    => 1,
                'per_page'     => $materiais->count(),
                'total'        => $materiais->count(),
            ],
            'message' => 'OK',
        ]);
    }

    public function store(CriarMaterialObraRequest $request): JsonResponse
    {
        $dados = $request->validated();
        $material = MaterialObra::create([
            ...$dados,
            'codigo' => strtoupper($dados['codigo']),
            'status' => $dados['status'] ?? 'ATIVO',
        ]);

        return response()->json(['data' => $material, 'message' => 'Material cadastrado com sucesso.'], 201);
    }

    public function update(AtualizarMaterialObraRequest $request, MaterialObra $materiaisObra): JsonResponse
    {
        $materiaisObra->update($request->validated());

        return response()->json(['data' => $materiaisObra->fresh(), 'message' => 'Material atualizado com sucesso.']);
    }

    /**
     * RF-028 — Importação em lote via texto colado, já parseado em itens no
     * frontend. Ignora silenciosamente itens cujo código já exista.
     */
    public function importar(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'itens'                => ['required', 'array', 'min:1'],
            'itens.*.codigo'       => ['required', 'string'],
            'itens.*.nome'         => ['required', 'string'],
            'itens.*.categoria'    => ['nullable', 'string'],
            'itens.*.unidade'      => ['nullable', 'string'],
            'itens.*.especificacao' => ['nullable', 'string'],
        ]);

        $existentes = MaterialObra::pluck('codigo')->map(fn ($c) => strtoupper($c))->flip();
        $importados = 0;

        foreach ($dados['itens'] as $item) {
            $codigo = strtoupper(trim($item['codigo']));
            if ($codigo === '' || isset($existentes[$codigo])) {
                continue;
            }

            MaterialObra::create([
                'codigo'        => $codigo,
                'nome'          => $item['nome'],
                'categoria'     => $item['categoria'] ?: 'Outros',
                'unidade'       => $item['unidade'] ?? 'UN',
                'especificacao' => $item['especificacao'] ?? null,
                'status'        => 'ATIVO',
            ]);
            $existentes[$codigo] = true;
            $importados++;
        }

        return response()->json(['data' => ['importados' => $importados], 'message' => "{$importados} material(is) importado(s)."]);
    }
}
