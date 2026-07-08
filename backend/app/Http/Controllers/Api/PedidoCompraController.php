<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AtualizarStatusPedidoCompraRequest;
use App\Http\Requests\CriarPedidoCompraRequest;
use App\Models\PedidoCompra;
use App\Services\PedidoCompraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PedidoCompraController extends Controller
{
    public function __construct(private PedidoCompraService $service) {}

    public function index(Request $request): JsonResponse
    {
        $query = PedidoCompra::orderByDesc('created_at');
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($setorOrigem = $request->query('setor_origem')) {
            $query->where('setor_origem', $setorOrigem);
        }
        $pedidos = $query->get();

        return response()->json([
            'data' => [
                'data'         => $pedidos,
                'current_page' => 1,
                'last_page'    => 1,
                'per_page'     => $pedidos->count(),
                'total'        => $pedidos->count(),
            ],
            'message' => 'OK',
        ]);
    }

    public function show(PedidoCompra $pedidoCompra): JsonResponse
    {
        return response()->json(['data' => $pedidoCompra, 'message' => 'OK']);
    }

    public function store(CriarPedidoCompraRequest $request): JsonResponse
    {
        $pedido = $this->service->criar($request->validated(), $request->user());

        return response()->json(['data' => $pedido, 'message' => 'Pedido de compra criado com sucesso.'], 201);
    }

    public function update(CriarPedidoCompraRequest $request, PedidoCompra $pedidoCompra): JsonResponse
    {
        $pedidoCompra->update($request->validated());

        return response()->json(['data' => $pedidoCompra->fresh(), 'message' => 'Pedido de compra atualizado com sucesso.']);
    }

    /**
     * RF-022: somente Admin aprova/cancela.
     */
    public function updateStatus(AtualizarStatusPedidoCompraRequest $request, PedidoCompra $pedidoCompra): JsonResponse
    {
        $status = $request->validated('status');

        if (in_array($status, ['APROVADO', 'CANCELADO'], true) && ! $request->user()->isAdmin()) {
            return response()->json(['data' => null, 'message' => 'Somente administradores podem aprovar ou cancelar pedidos de compra.'], 403);
        }

        $pedidoCompra->update(['status' => $status]);

        return response()->json(['data' => $pedidoCompra->fresh(), 'message' => "Pedido marcado como {$status}."]);
    }
}
