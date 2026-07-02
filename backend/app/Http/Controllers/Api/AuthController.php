<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Models\Setor;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * RF-002.2/RF-002.3/RF-002.4 — autentica por setor + login + senha,
     * gera token Sanctum e retorna o usuário com setor e módulos liberados.
     */
    public function login(LoginRequest $request)
    {
        $setor = Setor::where('codigo', $request->setor)->firstOrFail();

        $user = User::where('login', $request->login)
            ->where('setor_id', $setor->id)
            ->where('ativo', true)
            ->first();

        if (! $user || ! Hash::check($request->senha, $user->password)) {
            return response()->json([
                'data' => null,
                'message' => 'Usuário ou senha incorretos.',
            ], 422);
        }

        $token = $user->createToken('geplan-' . $user->login)->plainTextToken;

        return response()->json([
            'data' => [
                'token' => $token,
                'user' => $this->serializeUser($user),
            ],
            'message' => 'Login realizado com sucesso.',
        ]);
    }

    /**
     * RF-002.6 — encerra a sessão revogando o token atual.
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'data' => null,
            'message' => 'Sessão encerrada.',
        ]);
    }

    /**
     * RF-002.5 — usado pelo frontend para restaurar a sessão ao recarregar
     * a página (o token já fica salvo no client).
     */
    public function me(Request $request)
    {
        return response()->json([
            'data' => $this->serializeUser($request->user()),
            'message' => null,
        ]);
    }

    private function serializeUser(User $user): array
    {
        $user->load('setor', 'modulos');

        return [
            'id' => $user->id,
            'nome' => $user->nome,
            'login' => $user->login,
            'nivel' => $user->nivel,
            'setor' => $user->setor->codigo,
            'modulos' => $user->modulos->pluck('chave'),
        ];
    }
}
