<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ModuloController;
use App\Http\Controllers\Api\PedidoOrcamentoController;
use App\Http\Controllers\Api\ProdutoController;
use App\Http\Controllers\Api\SolicitacaoCompraController;
use App\Http\Controllers\Api\UsuarioController;
use App\Http\Controllers\Api\VeiculoController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me',      [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // RN-002.1 — módulos disponíveis por setor (usado na tela de permissões)
    Route::get('/modulos', [ModuloController::class, 'index']);

    // RF-011 — Fichas de Produtos (leitura livre; escrita só Admin, checado no controller)
    Route::get('/produtos',                [ProdutoController::class, 'index']);
    Route::get('/produtos/{identificador}', [ProdutoController::class, 'show']);
    Route::post('/produtos',               [ProdutoController::class, 'store']);
    Route::put('/produtos/{identificador}', [ProdutoController::class, 'update']);
    Route::delete('/produtos/{identificador}', [ProdutoController::class, 'destroy']);

    // RF-016 — Frotas de Veículos
    Route::get('/veiculos',            [VeiculoController::class, 'index']);
    Route::post('/veiculos',           [VeiculoController::class, 'store']);
    Route::put('/veiculos/{veiculo}',  [VeiculoController::class, 'update']);

    // RF-027 — Administração de Usuários
    Route::get('/usuarios',                   [UsuarioController::class, 'index']);
    Route::get('/usuarios/{usuario}',         [UsuarioController::class, 'show']);
    Route::post('/usuarios',                  [UsuarioController::class, 'store']);
    Route::put('/usuarios/{usuario}',         [UsuarioController::class, 'update']);
    Route::patch('/usuarios/{usuario}/senha', [UsuarioController::class, 'resetSenha']);

    // Pedidos de Orçamento (Manutenção ⇄ Suprimentos, dupla aprovação)
    Route::get('/pedidos-orcamento',  [PedidoOrcamentoController::class, 'index']);

    Route::post('/pedidos-orcamento', [PedidoOrcamentoController::class, 'store'])
        ->middleware('responsabilidade:pedido_orcamento,solicitante');

    Route::post('/pedidos-orcamento/{pedidoOrcamento}/iniciar-cotacao',
        [PedidoOrcamentoController::class, 'iniciarCotacao']
    )->middleware('responsabilidade:pedido_orcamento,cotador');

    Route::post('/pedidos-orcamento/{pedidoOrcamento}/enviar-aprovacao-manutencao',
        [PedidoOrcamentoController::class, 'enviarAprovacaoManutencao']
    )->middleware('responsabilidade:pedido_orcamento,cotador');

    Route::post('/pedidos-orcamento/{pedidoOrcamento}/aprovar-manutencao',
        [PedidoOrcamentoController::class, 'aprovarManutencao']
    )->middleware('responsabilidade:pedido_orcamento,aprovador_manutencao');

    Route::post('/pedidos-orcamento/{pedidoOrcamento}/rejeitar',
        [PedidoOrcamentoController::class, 'rejeitar']
    )->middleware('responsabilidade:pedido_orcamento,aprovador_manutencao,aprovador_suprimentos');

    Route::post('/pedidos-orcamento/{pedidoOrcamento}/aprovar-compra',
        [PedidoOrcamentoController::class, 'aprovarCompra']
    )->middleware('responsabilidade:pedido_orcamento,aprovador_suprimentos');

    Route::post('/pedidos-orcamento/{pedidoOrcamento}/registrar-compra',
        [PedidoOrcamentoController::class, 'registrarCompra']
    )->middleware('responsabilidade:pedido_orcamento,comprador');

    Route::post('/pedidos-orcamento/{pedidoOrcamento}/confirmar-recebimento',
        [PedidoOrcamentoController::class, 'confirmarRecebimento']
    )->middleware('papel:op_manutencao,admin_manutencao,almoxarife');

    Route::post('/pedidos-orcamento/{pedidoOrcamento}/confirmar-retirada',
        [PedidoOrcamentoController::class, 'confirmarRetirada']
    )->middleware('papel:op_manutencao,admin_manutencao');

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
