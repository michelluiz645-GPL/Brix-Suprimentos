<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConfirmarEntregaRequest;
use App\Models\Movimento;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EntregaController extends Controller
{
    /**
     * RF-009 — Entregas Pendentes: saídas tipo "Entrega" agrupadas por
     * numero_pedido, com status derivado de confirmado_por (ainda não
     * confirmado = PENDENTE).
     */
    public function index(Request $request): JsonResponse
    {
        $grupos = Movimento::where('tipo', 'SAÍDA')
            ->where('tipo_saida', 'Entrega')
            ->where('status', 'ATIVO')
            ->orderByDesc('data')
            ->get()
            ->groupBy('numero_pedido')
            ->map(function ($linhas) {
                $primeira = $linhas->first();

                return [
                    'id'               => $primeira->id,
                    'numero_pedido'    => $primeira->numero_pedido,
                    'equipe'           => $primeira->equipe,
                    'nome_equipe'      => $primeira->nome_equipe,
                    'colaborador'      => $primeira->colaborador,
                    'entregador'       => $primeira->entregador,
                    'resp_almox'       => $primeira->responsavel,
                    'registrado_por'   => $primeira->usuario,
                    'data_saida'       => $primeira->data?->format('Y-m-d'),
                    'almoxarifado'     => $primeira->almoxarifado,
                    'status'           => $primeira->confirmado_por ? 'ENTREGUE' : 'PENDENTE',
                    'confirmado_por'   => $primeira->confirmado_por,
                    'data_confirmacao' => $primeira->data_confirmacao?->format('Y-m-d'),
                    'itens'            => $linhas->map(fn ($l) => [
                        'nome' => $l->nome, 'unid' => $l->unid, 'qtd' => (float) $l->qtd, 'preco' => (float) $l->preco,
                    ])->values(),
                ];
            })
            ->values();

        if ($status = $request->query('status')) {
            $grupos = $grupos->where('status', $status)->values();
        }

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

    public function confirmar(ConfirmarEntregaRequest $request, int $id): JsonResponse
    {
        $referencia = Movimento::where('tipo', 'SAÍDA')->where('tipo_saida', 'Entrega')->findOrFail($id);

        if ($referencia->confirmado_por) {
            return response()->json(['data' => null, 'message' => 'Esta entrega já foi confirmada.'], 422);
        }

        Movimento::where('numero_pedido', $referencia->numero_pedido)
            ->where('tipo', 'SAÍDA')
            ->update($request->validated());

        return response()->json(['data' => null, 'message' => 'Entrega confirmada com sucesso.']);
    }
}
