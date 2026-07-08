<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AtualizarObraRequest;
use App\Http\Requests\CriarObraRequest;
use App\Models\Obra;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ObraController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Obra::with('criadoPor')->orderByDesc('created_at');
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($tipo = $request->query('tipo')) {
            $query->where('tipo', $tipo);
        }
        $obras = $query->get()->map(fn ($o) => $this->serialize($o));

        return response()->json([
            'data' => [
                'data'         => $obras,
                'current_page' => 1,
                'last_page'    => 1,
                'per_page'     => $obras->count(),
                'total'        => $obras->count(),
            ],
            'message' => 'OK',
        ]);
    }

    public function show(Obra $obra): JsonResponse
    {
        return response()->json(['data' => $this->serialize($obra->load('criadoPor')), 'message' => 'OK']);
    }

    public function store(CriarObraRequest $request): JsonResponse
    {
        $obra = Obra::create([
            ...$request->validated(),
            'status'        => $request->validated()['status'] ?? 'ATIVA',
            'criado_por_id' => $request->user()->id,
        ]);

        return response()->json(['data' => $this->serialize($obra->fresh('criadoPor')), 'message' => 'Obra cadastrada com sucesso.'], 201);
    }

    public function update(AtualizarObraRequest $request, Obra $obra): JsonResponse
    {
        $obra->update($request->validated());

        return response()->json(['data' => $this->serialize($obra->fresh('criadoPor')), 'message' => 'Obra atualizada com sucesso.']);
    }

    private function serialize(Obra $o): array
    {
        return [
            'id' => $o->id, 'setor' => $o->setor, 'nome' => $o->nome, 'tipo' => $o->tipo,
            'descricao' => $o->descricao, 'responsavel' => $o->responsavel,
            'data_inicio' => $o->data_inicio?->format('Y-m-d'), 'data_prev' => $o->data_prev?->format('Y-m-d'),
            'centro_custo' => $o->centro_custo, 'status' => $o->status,
            'criado_em' => $o->created_at?->format('d/m/Y H:i'), 'criado_por' => $o->criadoPor?->nome,
        ];
    }
}
