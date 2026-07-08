<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AtualizarEquipamentoRequest;
use App\Http\Requests\CriarEquipamentoRequest;
use App\Models\Equipamento;
use Illuminate\Http\JsonResponse;

class EquipamentoController extends Controller
{
    public function index(): JsonResponse
    {
        $equipamentos = Equipamento::orderBy('nome')->get();

        return response()->json([
            'data' => [
                'data'         => $equipamentos,
                'current_page' => 1,
                'last_page'    => 1,
                'per_page'     => $equipamentos->count(),
                'total'        => $equipamentos->count(),
            ],
            'message' => 'OK',
        ]);
    }

    public function store(CriarEquipamentoRequest $request): JsonResponse
    {
        $equipamento = Equipamento::create([...$request->validated(), 'status' => $request->validated()['status'] ?? 'ATIVO']);

        return response()->json(['data' => $equipamento, 'message' => 'Equipamento cadastrado com sucesso.'], 201);
    }

    public function update(AtualizarEquipamentoRequest $request, Equipamento $equipamento): JsonResponse
    {
        $equipamento->update($request->validated());

        return response()->json(['data' => $equipamento->fresh(), 'message' => 'Equipamento atualizado com sucesso.']);
    }
}
