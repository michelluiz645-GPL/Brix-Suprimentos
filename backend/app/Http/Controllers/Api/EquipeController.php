<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AtualizarEquipeRequest;
use App\Http\Requests\CriarEquipeRequest;
use App\Models\Equipe;
use Illuminate\Http\JsonResponse;

class EquipeController extends Controller
{
    public function index(): JsonResponse
    {
        $equipes = Equipe::orderBy('numero')->get();

        return response()->json([
            'data' => [
                'data'         => $equipes,
                'current_page' => 1,
                'last_page'    => 1,
                'per_page'     => $equipes->count(),
                'total'        => $equipes->count(),
            ],
            'message' => 'OK',
        ]);
    }

    public function store(CriarEquipeRequest $request): JsonResponse
    {
        $equipe = Equipe::create($request->validated());

        return response()->json(['data' => $equipe, 'message' => 'Equipe cadastrada com sucesso.'], 201);
    }

    public function update(AtualizarEquipeRequest $request, Equipe $equipe): JsonResponse
    {
        $equipe->update($request->validated());

        return response()->json(['data' => $equipe->fresh(), 'message' => 'Equipe atualizada com sucesso.']);
    }
}
