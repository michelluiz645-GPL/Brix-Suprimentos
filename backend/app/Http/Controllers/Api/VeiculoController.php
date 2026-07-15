<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AtualizarVeiculoRequest;
use App\Http\Requests\CriarVeiculoRequest;
use App\Models\Setor;
use App\Models\Veiculo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VeiculoController extends Controller
{
    public function index(): JsonResponse
    {
        $veiculos = Veiculo::orderBy('placa')->get();

        return response()->json([
            'data' => [
                'data'         => $veiculos,
                'current_page' => 1,
                'last_page'    => 1,
                'per_page'     => $veiculos->count(),
                'total'        => $veiculos->count(),
            ],
            'message' => 'OK',
        ]);
    }

    /**
     * Qualquer setor pode cadastrar um veículo (ex.: Manutenção registrando
     * uma frota que ainda não existia) — só a edição é restrita ao Almoxarifado.
     */
    public function store(CriarVeiculoRequest $request): JsonResponse
    {
        $veiculo = Veiculo::create([...$request->validated(), 'status' => $request->validated()['status'] ?? 'ATIVO']);

        return response()->json(['data' => $veiculo, 'message' => 'Veículo cadastrado com sucesso.'], 201);
    }

    public function update(AtualizarVeiculoRequest $request, Veiculo $veiculo): JsonResponse
    {
        if ($request->user()->setor?->codigo !== Setor::ALMOXARIFADO) {
            return response()->json([
                'data'    => null,
                'message' => 'Somente o Almoxarifado pode editar veículos da frota.',
            ], 403);
        }

        $veiculo->update($request->validated());

        return response()->json(['data' => $veiculo->fresh(), 'message' => 'Veículo atualizado com sucesso.']);
    }
}
