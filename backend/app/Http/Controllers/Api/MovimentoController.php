<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CriarMovimentoRequest;
use App\Models\Movimento;
use App\Services\MovimentoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MovimentoController extends Controller
{
    public function __construct(private MovimentoService $service) {}

    public function index(Request $request): JsonResponse
    {
        $query = Movimento::orderByDesc('data')->orderByDesc('id');
        if ($tipo = $request->query('tipo')) {
            $query->where('tipo', $tipo);
        }
        $movimentos = $query->get();

        return response()->json([
            'data' => [
                'data'         => $movimentos,
                'current_page' => 1,
                'last_page'    => 1,
                'per_page'     => $movimentos->count(),
                'total'        => $movimentos->count(),
            ],
            'message' => 'OK',
        ]);
    }

    public function store(CriarMovimentoRequest $request): JsonResponse
    {
        try {
            $resultado = $this->service->criar($request->validated(), $request->user());
        } catch (\InvalidArgumentException $e) {
            return response()->json(['data' => null, 'message' => $e->getMessage()], 422);
        }

        return response()->json([
            'data'    => ['numero_pedido' => $resultado['numero_pedido']],
            'message' => 'Movimentação registrada com sucesso.',
        ], 201);
    }
}
