<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SolicitacaoCompra;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SolicitacaoCompraController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = SolicitacaoCompra::query()->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('setor')) {
            $query->where('setor', $request->setor);
        }

        $scs = $query->get()->map(fn($sc) => $this->serialize($sc));

        return response()->json(['data' => $scs, 'message' => 'OK']);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'data'            => ['required', 'date'],
            'data_necessaria' => ['nullable', 'date'],
            'solicitante'     => ['required', 'string', 'max:255'],
            'funcao'          => ['nullable', 'string', 'max:255'],
            'setor'           => ['required', 'string'],
            'destino_tipo'    => ['nullable', 'string'],
            'destino'         => ['nullable', 'string'],
            'urgencia'        => ['nullable', 'string'],
            'local_entrega'   => ['nullable', 'string'],
            'motivo'          => ['nullable', 'string'],
            'itens'           => ['nullable', 'array'],
        ]);

        $data['status'] = 'PENDENTE';
        $data['numero'] = $this->gerarNumero();

        $sc = SolicitacaoCompra::create($data);

        return response()->json(['data' => $this->serialize($sc), 'message' => 'Solicitação criada com sucesso.'], 201);
    }

    public function show(SolicitacaoCompra $solicitacao): JsonResponse
    {
        return response()->json(['data' => $this->serialize($solicitacao), 'message' => 'OK']);
    }

    public function updateStatus(Request $request, SolicitacaoCompra $solicitacao): JsonResponse
    {
        $request->validate([
            'status'        => ['required', 'string'],
            'obs_aprovador' => ['nullable', 'string'],
        ]);

        $solicitacao->update([
            'status'        => $request->status,
            'obs_aprovador' => $request->obs_aprovador,
        ]);

        return response()->json(['data' => $this->serialize($solicitacao), 'message' => 'Status atualizado.']);
    }

    private function serialize(SolicitacaoCompra $sc): array
    {
        return [
            'id'             => $sc->id,
            'numero'         => $sc->numero,
            'data'           => $sc->data?->format('Y-m-d'),
            'data_necessaria'=> $sc->data_necessaria?->format('Y-m-d'),
            'solicitante'    => $sc->solicitante,
            'funcao'         => $sc->funcao,
            'setor'          => $sc->setor,
            'destino_tipo'   => $sc->destino_tipo,
            'destino'        => $sc->destino,
            'urgencia'       => $sc->urgencia,
            'local_entrega'  => $sc->local_entrega,
            'motivo'         => $sc->motivo,
            'status'         => $sc->status,
            'obs_aprovador'  => $sc->obs_aprovador,
            'itens'          => $sc->itens ?? [],
            'created_at'     => $sc->created_at?->format('d/m/Y H:i'),
        ];
    }

    private function gerarNumero(): string
    {
        $ano   = date('Y');
        $ultimo = SolicitacaoCompra::whereYear('created_at', $ano)->count() + 1;
        return sprintf('SC-%s-%04d', $ano, $ultimo);
    }
}
