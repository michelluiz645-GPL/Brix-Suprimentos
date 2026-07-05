<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Modulo;
use App\Services\PermissaoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ModuloController extends Controller
{
    public function __construct(private PermissaoService $permissaoService) {}

    /**
     * RN-002.1 — lista os módulos que PODEM ser selecionados para um setor.
     * Sem o parâmetro `setor`, devolve o catálogo completo (uso administrativo).
     */
    public function index(Request $request): JsonResponse
    {
        $modulos = $request->filled('setor')
            ? $this->permissaoService->modulosDisponiveisParaSetor($request->string('setor'))
            : Modulo::all();

        return response()->json([
            'data' => $modulos->map(fn (Modulo $m) => [
                'chave' => $m->chave,
                'nome'  => $m->nome,
            ])->values(),
            'message' => null,
        ]);
    }
}
