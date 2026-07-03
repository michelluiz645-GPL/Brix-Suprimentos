<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PedidoOrcamento;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PedidoOrcamentoController extends Controller
{
    public function index(): JsonResponse
    {
        $pedidos = PedidoOrcamento::orderByDesc('created_at')->get()
            ->map(fn ($p) => $this->serialize($p));

        return response()->json(['data' => $pedidos, 'message' => 'OK']);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'numero_sc'    => ['required', 'string', 'unique:pedidos_orcamento,numero_sc'],
            'data'         => ['required', 'date'],
            'setor'        => ['required', 'string'],
            'solicitante'  => ['required', 'string'],
            'destino'      => ['required', 'string'],
            'tipo_destino' => ['required', 'in:FROTA,OBRA,EQUIPAMENTO'],
            'urgencia'     => ['required', 'in:CRITICA,ALTA,MEDIA,BAIXA'],
            'itens'        => ['required', 'array', 'min:1'],
            'itens.*.descricao'  => ['required', 'string'],
            'itens.*.quantidade' => ['required', 'numeric', 'min:0.01'],
            'itens.*.unidade'    => ['required', 'string'],
            'valor_total'  => ['nullable', 'numeric', 'min:0'],
            'timeline'     => ['required', 'array'],
        ], [
            'numero_sc.unique' => 'Este número de SC já existe.',
            'itens.required'   => 'Adicione ao menos um item.',
            'destino.required' => 'O destino é obrigatório.',
        ]);

        $pedido = PedidoOrcamento::create([
            ...$data,
            'status'      => 'PENDENTE',
            'valor_total' => $data['valor_total'] ?? 0,
        ]);

        return response()->json([
            'data'    => $this->serialize($pedido),
            'message' => 'Pedido de orçamento criado com sucesso.',
        ], 201);
    }

    public function updateStatus(Request $request, PedidoOrcamento $pedidoOrcamento): JsonResponse
    {
        $data = $request->validate([
            'status'   => ['required', 'in:PENDENTE,COTANDO,AGUARDANDO_APROVACAO,APROVADO,EM_TRANSITO,CONCLUIDO,REJEITADO'],
            'timeline' => ['required', 'array'],
            'valor_total' => ['nullable', 'numeric', 'min:0'],
        ]);

        $pedidoOrcamento->update([
            'status'      => $data['status'],
            'timeline'    => $data['timeline'],
            'valor_total' => $data['valor_total'] ?? $pedidoOrcamento->valor_total,
        ]);

        return response()->json([
            'data'    => $this->serialize($pedidoOrcamento->fresh()),
            'message' => 'Status atualizado com sucesso.',
        ]);
    }

    private function serialize(PedidoOrcamento $p): array
    {
        return [
            'id'           => $p->id,
            'numero_sc'    => $p->numero_sc,
            'data'         => $p->data?->format('Y-m-d'),
            'setor'        => $p->setor,
            'solicitante'  => $p->solicitante,
            'destino'      => $p->destino,
            'tipo_destino' => $p->tipo_destino,
            'urgencia'     => $p->urgencia,
            'status'       => $p->status,
            'itens'        => $p->itens,
            'valor_total'  => (float) $p->valor_total,
            'timeline'     => $p->timeline,
        ];
    }
}
