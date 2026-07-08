<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CriarDevolucaoRequest;
use App\Services\DevolucaoService;
use Illuminate\Http\JsonResponse;

class DevolucaoController extends Controller
{
    public function __construct(private DevolucaoService $service) {}

    public function store(CriarDevolucaoRequest $request): JsonResponse
    {
        try {
            $numeroPedido = $this->service->criar($request->validated(), $request->user());
        } catch (\InvalidArgumentException $e) {
            return response()->json(['data' => null, 'message' => $e->getMessage()], 422);
        }

        return response()->json([
            'data'    => ['numero_pedido' => $numeroPedido],
            'message' => 'Devolução registrada com sucesso.',
        ], 201);
    }
}
