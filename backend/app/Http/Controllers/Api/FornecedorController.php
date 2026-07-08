<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AtualizarFornecedorRequest;
use App\Http\Requests\CriarFornecedorRequest;
use App\Models\Fornecedor;
use App\Models\Setor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FornecedorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Fornecedor::with('criadoPor')->orderBy('nome');
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        $fornecedores = $query->get()->map(fn ($f) => $this->serialize($f));

        return response()->json([
            'data' => [
                'data'         => $fornecedores,
                'current_page' => 1,
                'last_page'    => 1,
                'per_page'     => $fornecedores->count(),
                'total'        => $fornecedores->count(),
            ],
            'message' => 'OK',
        ]);
    }

    public function store(CriarFornecedorRequest $request): JsonResponse
    {
        if ($erro = $this->erroSePermissaoInsuficiente($request)) {
            return $erro;
        }

        $fornecedor = Fornecedor::create([
            ...$request->validated(),
            'status'        => $request->validated()['status'] ?? 'ATIVO',
            'criado_por_id' => $request->user()->id,
        ]);

        return response()->json(['data' => $this->serialize($fornecedor->fresh('criadoPor')), 'message' => 'Fornecedor cadastrado com sucesso.'], 201);
    }

    public function update(AtualizarFornecedorRequest $request, Fornecedor $fornecedor): JsonResponse
    {
        if ($erro = $this->erroSePermissaoInsuficiente($request)) {
            return $erro;
        }

        $fornecedor->update($request->validated());

        return response()->json(['data' => $this->serialize($fornecedor->fresh('criadoPor')), 'message' => 'Fornecedor atualizado com sucesso.']);
    }

    /**
     * RF-018: só Engenharia Admin edita — Almoxarifado (qualquer nível) só consulta.
     */
    private function erroSePermissaoInsuficiente(Request $request): ?JsonResponse
    {
        $user = $request->user();
        if ($user->setor?->codigo === Setor::ENGENHARIA && $user->isAdmin()) {
            return null;
        }

        return response()->json([
            'data'    => null,
            'message' => 'Somente o Admin da Engenharia pode criar ou editar fornecedores.',
        ], 403);
    }

    private function serialize(Fornecedor $f): array
    {
        return [
            'id' => $f->id, 'nome' => $f->nome, 'cnpj' => $f->cnpj, 'tel' => $f->tel,
            'email' => $f->email, 'contato' => $f->contato, 'cidade' => $f->cidade, 'estado' => $f->estado,
            'obs' => $f->obs, 'status' => $f->status,
            'criado_em' => $f->created_at?->format('d/m/Y H:i'),
            'criado_por' => $f->criadoPor?->nome,
        ];
    }
}
