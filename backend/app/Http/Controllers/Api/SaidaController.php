<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CriarSaidaRequest;
use App\Models\Movimento;
use App\Services\SaidaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SaidaController extends Controller
{
    public function __construct(private SaidaService $service) {}

    public function store(CriarSaidaRequest $request): JsonResponse
    {
        try {
            $numeroPedido = $this->service->criar($request->validated(), $request->user());
        } catch (\InvalidArgumentException $e) {
            return response()->json(['data' => null, 'message' => $e->getMessage()], 422);
        }

        return response()->json([
            'data'    => ['numero_pedido' => $numeroPedido],
            'message' => 'Saída registrada com sucesso.',
        ], 201);
    }

    /**
     * RF-007 — Histórico de Cupons: um cupom por numero_pedido, agrupando as
     * linhas do ledger que pertencem à mesma saída.
     */
    public function cupons(): JsonResponse
    {
        $grupos = Movimento::where('tipo', 'SAÍDA')
            ->orderByDesc('data')
            ->get()
            ->groupBy('numero_pedido')
            ->map(function ($linhas) {
                $primeira = $linhas->first();

                return [
                    'numero_pedido' => $primeira->numero_pedido,
                    'tipo_saida'    => $primeira->tipo_saida,
                    'equipe'        => $primeira->equipe,
                    'nome_equipe'   => $primeira->nome_equipe,
                    'colaborador'   => $primeira->colaborador,
                    'entregador'    => $primeira->entregador,
                    'resp_almox'    => $primeira->responsavel,
                    'data_saida'    => $primeira->data?->format('Y-m-d'),
                    'almoxarifado'  => $primeira->almoxarifado,
                    'status'        => $primeira->status,
                    'itens'         => $linhas->map(fn ($l) => [
                        'movimento_id' => $l->id, 'codigo' => $l->codigo, 'variacao_id' => $l->produto_variacao_id,
                        'nome' => $l->nome, 'unid' => $l->unid, 'qtd' => (float) $l->qtd, 'preco' => (float) $l->preco, 'obs' => $l->obs,
                    ])->values(),
                ];
            })
            ->values();

        return response()->json([
            'data' => [
                'data'         => $grupos,
                'current_page' => 1,
                'last_page'    => 1,
                'per_page'     => $grupos->count(),
                'total'        => $grupos->count(),
            ],
            'message' => 'OK',
        ]);
    }

    /**
     * RF-007 — Cancelamento com estorno de estoque (Admin).
     */
    public function cancelar(Request $request, string $numeroPedido): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['data' => null, 'message' => 'Somente administradores podem cancelar cupons.'], 403);
        }

        try {
            $this->service->cancelar($numeroPedido);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['data' => null, 'message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => null, 'message' => 'Cupom cancelado e estoque estornado com sucesso.']);
    }
}
