<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerificaPapel
{
    public function handle(Request $request, Closure $next, string ...$papeis): Response
    {
        $usuario = $request->user();

        if (! $usuario || ! $usuario->temPapel(...$papeis)) {
            return response()->json([
                'data'    => null,
                'message' => 'Acesso não permitido para este papel.',
            ], 403);
        }

        return $next($request);
    }
}
