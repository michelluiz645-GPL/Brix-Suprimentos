<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerificaResponsabilidade
{
    /**
     * Uso na rota: ->middleware('responsabilidade:pedido_orcamento,cotador')
     * O primeiro argumento é a chave do módulo, os demais são
     * responsabilidades aceitas (basta ter uma delas).
     */
    public function handle(Request $request, Closure $next, string $modulo, string ...$responsabilidades): Response
    {
        $usuario = $request->user();

        $autorizado = $usuario && array_any(
            $responsabilidades,
            fn (string $resp) => $usuario->temResponsabilidade($modulo, $resp)
        );

        if (! $autorizado) {
            return response()->json([
                'data'    => null,
                'message' => 'Você não tem a responsabilidade necessária para esta ação.',
            ], 403);
        }

        return $next($request);
    }
}
