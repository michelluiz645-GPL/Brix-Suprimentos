<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AtualizarEpiRegistroRequest;
use App\Http\Requests\CriarEpiRegistroRequest;
use App\Models\EpiRegistro;
use Illuminate\Http\JsonResponse;

class EpiRegistroController extends Controller
{
    public function index(): JsonResponse
    {
        $registros = EpiRegistro::orderBy('proxima_troca')->get();

        return response()->json([
            'data' => [
                'data'         => $registros,
                'current_page' => 1,
                'last_page'    => 1,
                'per_page'     => $registros->count(),
                'total'        => $registros->count(),
            ],
            'message' => 'OK',
        ]);
    }

    public function store(CriarEpiRegistroRequest $request): JsonResponse
    {
        $registro = EpiRegistro::create($request->validated());

        return response()->json(['data' => $registro, 'message' => 'Entrega de EPI registrada com sucesso.'], 201);
    }

    public function update(AtualizarEpiRegistroRequest $request, EpiRegistro $epi): JsonResponse
    {
        $epi->update($request->validated());

        return response()->json(['data' => $epi->fresh(), 'message' => 'Registro de EPI atualizado com sucesso.']);
    }
}
