<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UsuarioController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me',     [AuthController::class, 'me']);
    Route::post('/logout',[AuthController::class, 'logout']);

    // RF-027 — Administração de Usuários
    Route::get('/usuarios',                    [UsuarioController::class, 'index']);
    Route::post('/usuarios',                   [UsuarioController::class, 'store']);
    Route::put('/usuarios/{usuario}',          [UsuarioController::class, 'update']);
    Route::patch('/usuarios/{usuario}/senha',  [UsuarioController::class, 'resetSenha']);
});
