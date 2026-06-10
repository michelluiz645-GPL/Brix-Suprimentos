<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'login' => 'required|string',
            'senha' => 'required|string',
        ]);

        $user = User::where('login', $request->login)->first();

        if (! $user || ! Hash::check($request->senha, $user->senha)) {
            return response()->json([
                'message' => 'Usuário ou senha incorretos.',
            ], 401);
        }

        $token = $user->createToken('geplan-token')->plainTextToken;

        return response()->json([
            'data'    => ['user' => $user, 'token' => $token],
            'message' => 'Login realizado com sucesso.',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Sessão encerrada com sucesso.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => ['user' => $request->user()],
        ]);
    }
}
