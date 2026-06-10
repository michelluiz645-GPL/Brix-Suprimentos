<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UsuarioController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => User::orderBy('nome')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'login'  => 'required|string|unique:users',
            'nome'   => 'required|string|max:255',
            'senha'  => 'required|string|min:6',
            'nivel'  => 'required|in:ADMIN,OPERADOR',
            'setor'  => 'required|in:ALMOXARIFADO,ENGENHARIA,MANUTENCAO',
            'modulos' => 'nullable|array',
        ]);

        $data['senha'] = Hash::make($data['senha']);
        $user = User::create($data);

        return response()->json([
            'data'    => $user,
            'message' => 'Usuário criado com sucesso.',
        ], 201);
    }

    public function update(Request $request, User $usuario): JsonResponse
    {
        $data = $request->validate([
            'login'  => 'sometimes|string|unique:users,login,' . $usuario->id,
            'nome'   => 'sometimes|string|max:255',
            'nivel'  => 'sometimes|in:ADMIN,OPERADOR',
            'setor'  => 'sometimes|in:ALMOXARIFADO,ENGENHARIA,MANUTENCAO',
            'modulos' => 'nullable|array',
        ]);

        $usuario->update($data);

        return response()->json([
            'data'    => $usuario,
            'message' => 'Usuário atualizado com sucesso.',
        ]);
    }

    public function resetSenha(Request $request, User $usuario): JsonResponse
    {
        $request->validate([
            'senha' => 'required|string|min:6',
        ]);

        $usuario->update(['senha' => Hash::make($request->senha)]);

        return response()->json([
            'message' => 'Senha redefinida com sucesso.',
        ]);
    }

    public function destroy(User $usuario): JsonResponse
    {
        if ($usuario->id === $request->user()->id) {
            return response()->json([
                'message' => 'Não é possível inativar o próprio usuário.',
            ], 422);
        }

        $usuario->delete();

        return response()->json([
            'message' => 'Usuário inativado com sucesso.',
        ]);
    }
}
