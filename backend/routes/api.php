<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PedidoOrcamentoController;
use App\Http\Controllers\Api\SolicitacaoCompraController;
use App\Http\Controllers\Api\UsuarioController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me',      [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // RF-027 — Administração de Usuários
    Route::get('/usuarios',                   [UsuarioController::class, 'index']);
    Route::get('/usuarios/{usuario}',         [UsuarioController::class, 'show']);
    Route::post('/usuarios',                  [UsuarioController::class, 'store']);
    Route::put('/usuarios/{usuario}',         [UsuarioController::class, 'update']);
    Route::patch('/usuarios/{usuario}/senha', [UsuarioController::class, 'resetSenha']);

    // Pedidos de Orçamento (Manutenção → Suprimentos)
    Route::get('/pedidos-orcamento',                              [PedidoOrcamentoController::class, 'index']);
    Route::post('/pedidos-orcamento',                             [PedidoOrcamentoController::class, 'store']);
    Route::patch('/pedidos-orcamento/{pedidoOrcamento}/status',   [PedidoOrcamentoController::class, 'updateStatus']);

    // RF-021 — Solicitação de Compra (SC)
    Route::get('/sc',  [SolicitacaoCompraController::class, 'index']);
    Route::get('/sc/{sc}', [SolicitacaoCompraController::class, 'show']);

    Route::post('/sc', [SolicitacaoCompraController::class, 'store']);

    Route::post('/sc/{sc}/cotacao',
        [SolicitacaoCompraController::class, 'registrarCotacao']
    )->middleware('papel:op_suprimentos,admin_suprimentos');

    Route::post('/sc/{sc}/aprovar-mnt',
        [SolicitacaoCompraController::class, 'aprovarMnt']
    )->middleware('papel:admin_manutencao');

    Route::post('/sc/{sc}/rejeitar-mnt',
        [SolicitacaoCompraController::class, 'rejeitarMnt']
    )->middleware('papel:admin_manutencao');

    Route::post('/sc/{sc}/aprovar-sup',
        [SolicitacaoCompraController::class, 'aprovarSup']
    )->middleware('papel:admin_suprimentos');

    Route::post('/sc/{sc}/comprar',
        [SolicitacaoCompraController::class, 'registrarCompra']
    )->middleware('papel:op_suprimentos,admin_suprimentos');

    Route::post('/sc/{sc}/entrada',
        [SolicitacaoCompraController::class, 'darEntrada']
    )->middleware('papel:almoxarife,op_suprimentos,admin_suprimentos');

    Route::post('/sc/{sc}/entrada-parcial',
        [SolicitacaoCompraController::class, 'darEntradaParcial']
    )->middleware('papel:almoxarife,op_suprimentos,admin_suprimentos');
});
