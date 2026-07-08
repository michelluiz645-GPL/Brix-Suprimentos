<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AtualizarFuncionarioRequest;
use App\Http\Requests\CriarFuncionarioRequest;
use App\Models\Funcionario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FuncionarioController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Funcionario::orderBy('nome');
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        $funcionarios = $query->get();

        return response()->json([
            'data' => [
                'data'         => $funcionarios,
                'current_page' => 1,
                'last_page'    => 1,
                'per_page'     => $funcionarios->count(),
                'total'        => $funcionarios->count(),
            ],
            'message' => 'OK',
        ]);
    }

    public function show(Funcionario $funcionario): JsonResponse
    {
        return response()->json(['data' => $funcionario, 'message' => 'OK']);
    }

    public function store(CriarFuncionarioRequest $request): JsonResponse
    {
        $funcionario = Funcionario::create([...$request->validated(), 'status' => $request->validated()['status'] ?? 'ATIVO']);

        return response()->json(['data' => $funcionario, 'message' => 'Funcionário cadastrado com sucesso.'], 201);
    }

    public function update(AtualizarFuncionarioRequest $request, Funcionario $funcionario): JsonResponse
    {
        $funcionario->update($request->validated());

        return response()->json(['data' => $funcionario->fresh(), 'message' => 'Funcionário atualizado com sucesso.']);
    }
}
