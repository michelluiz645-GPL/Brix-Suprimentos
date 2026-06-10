<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Almoxarifado\ProdutoController;
use App\Http\Controllers\Almoxarifado\MovimentoController;
use App\Http\Controllers\Almoxarifado\SaidaController;
use App\Http\Controllers\Almoxarifado\DevolucaoController;
use App\Http\Controllers\Almoxarifado\EntregaController;
use App\Http\Controllers\Almoxarifado\CombustivelController;
use App\Http\Controllers\Almoxarifado\FuncionarioController;
use App\Http\Controllers\Almoxarifado\EquipeController;
use App\Http\Controllers\Almoxarifado\VeiculoController;
use App\Http\Controllers\Engenharia\ObraController;
use App\Http\Controllers\Engenharia\FornecedorController;
use App\Http\Controllers\Shared\PedidoCompraController;
use App\Http\Controllers\Shared\EpiController;
use App\Http\Controllers\Shared\EquipamentoController;
use App\Http\Controllers\Shared\DebitoOficinaController;
use App\Http\Controllers\Shared\KoboController;
use App\Http\Controllers\Admin\UsuarioController;
use App\Http\Controllers\Admin\SistemaController;

// ──────────────────────────────────────────
// Rotas públicas
// ──────────────────────────────────────────
Route::post('/auth/login',  [AuthController::class, 'login']);

// ──────────────────────────────────────────
// Rotas protegidas (Sanctum)
// ──────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me',      [AuthController::class, 'me']);

    // ── Almoxarifado ──
    Route::apiResource('produtos',    ProdutoController::class);
    Route::apiResource('movimentos',  MovimentoController::class)->only(['index', 'store']);
    Route::apiResource('funcionarios', FuncionarioController::class);
    Route::apiResource('equipes',     EquipeController::class);
    Route::apiResource('veiculos',    VeiculoController::class);

    Route::prefix('saidas')->group(function () {
        Route::post('/',        [SaidaController::class, 'store']);
        Route::get('/cupons',   [SaidaController::class, 'cupons']);
    });

    Route::post('/devolucoes',                 [DevolucaoController::class, 'store']);

    Route::get('/entregas',                    [EntregaController::class, 'index']);
    Route::post('/entregas/{entrega}/confirmar', [EntregaController::class, 'confirmar']);

    Route::get('/combustiveis',      [CombustivelController::class, 'index']);
    Route::post('/combustiveis',     [CombustivelController::class, 'store']);
    Route::get('/combustiveis/saldo', [CombustivelController::class, 'saldo']);

    // ── Engenharia ──
    Route::apiResource('obras',       ObraController::class);
    Route::apiResource('fornecedores', FornecedorController::class);

    // ── Compartilhados ──
    Route::apiResource('pedidos-compra', PedidoCompraController::class);
    Route::patch('/pedidos-compra/{pedido}/status', [PedidoCompraController::class, 'updateStatus']);

    Route::apiResource('epi', EpiController::class)->except(['destroy']);
    Route::apiResource('equipamentos', EquipamentoController::class);

    Route::get('/debitos',             [DebitoOficinaController::class, 'index']);
    Route::post('/debitos',            [DebitoOficinaController::class, 'store']);
    Route::patch('/debitos/{debito}/pagar', [DebitoOficinaController::class, 'pagar']);

    // ── KOBO ──
    Route::get('/kobo/suprimentos', [KoboController::class, 'suprimentos']);
    Route::get('/kobo/compras',     [KoboController::class, 'compras']);

    // ── Admin ──
    Route::middleware('role:ADMIN')->group(function () {
        Route::apiResource('usuarios', UsuarioController::class);
        Route::patch('/usuarios/{usuario}/senha', [UsuarioController::class, 'resetSenha']);

        Route::get('/sistema/status',  [SistemaController::class, 'status']);
        Route::post('/sistema/sync',   [SistemaController::class, 'syncAll']);
        Route::get('/sistema/backup',  [SistemaController::class, 'backup']);
    });
});
