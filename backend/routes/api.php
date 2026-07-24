<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CombustivelController;
use App\Http\Controllers\Api\DebitoManutencaoController;
use App\Http\Controllers\Api\DevolucaoController;
use App\Http\Controllers\Api\EntregaController;
use App\Http\Controllers\Api\EquipamentoController;
use App\Http\Controllers\Api\EpiRegistroController;
use App\Http\Controllers\Api\EquipeController;
use App\Http\Controllers\Api\FornecedorController;
use App\Http\Controllers\Api\FuncionarioController;
use App\Http\Controllers\Api\KoboController;
use App\Http\Controllers\Api\MaterialObraController;
use App\Http\Controllers\Api\ModuloController;
use App\Http\Controllers\Api\MovimentoController;
use App\Http\Controllers\Api\ObraController;
use App\Http\Controllers\Api\PedidoCompraController;
use App\Http\Controllers\Api\SaidaController;
use App\Http\Controllers\Api\PedidoOrcamentoController;
use App\Http\Controllers\Api\ProdutoController;
use App\Http\Controllers\Api\RequisicaoAlmoxarifadoController;
use App\Http\Controllers\Api\SistemaController;
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

    // RF-014 — Funcionários
    Route::get('/funcionarios',              [FuncionarioController::class, 'index']);
    Route::get('/funcionarios/{funcionario}', [FuncionarioController::class, 'show']);
    Route::post('/funcionarios',             [FuncionarioController::class, 'store']);
    Route::put('/funcionarios/{funcionario}', [FuncionarioController::class, 'update']);

    // RF-015 — Equipes de Campo
    Route::get('/equipes',            [EquipeController::class, 'index']);
    Route::post('/equipes',           [EquipeController::class, 'store']);
    Route::put('/equipes/{equipe}',   [EquipeController::class, 'update']);

    // RF-018 — Fornecedores (leitura livre; escrita só Admin da Engenharia, checado no controller)
    Route::get('/fornecedores',              [FornecedorController::class, 'index']);
    Route::post('/fornecedores',             [FornecedorController::class, 'store']);
    Route::put('/fornecedores/{fornecedor}', [FornecedorController::class, 'update']);

    // RF-005 — Registrar Entrada (e ledger geral de movimentações)
    Route::get('/movimentos',  [MovimentoController::class, 'index']);
    Route::post('/movimentos', [MovimentoController::class, 'store']);

    // RF-006, RF-007 — Registrar Saída / Histórico de Cupons
    Route::get('/saidas/cupons',                       [SaidaController::class, 'cupons']);
    Route::post('/saidas',                             [SaidaController::class, 'store']);
    Route::post('/saidas/cupons/{numeroPedido}/cancelar', [SaidaController::class, 'cancelar']);

    // RF-008 — Devolução
    Route::post('/devolucoes', [DevolucaoController::class, 'store']);

    // RF-009 — Entregas Pendentes
    Route::get('/entregas',                  [EntregaController::class, 'index']);
    Route::post('/entregas/{id}/confirmar',  [EntregaController::class, 'confirmar']);

    // RF-010 — Combustíveis
    Route::get('/combustiveis/saldo', [CombustivelController::class, 'saldo']);
    Route::get('/combustiveis',       [CombustivelController::class, 'index']);
    Route::post('/combustiveis',      [CombustivelController::class, 'store']);

    // RF-024 — Equipamentos Pesados
    Route::get('/equipamentos',                [EquipamentoController::class, 'index']);
    Route::post('/equipamentos',               [EquipamentoController::class, 'store']);
    Route::put('/equipamentos/{equipamento}',  [EquipamentoController::class, 'update']);

    // RF-017 — Obras & Projetos
    Route::get('/obras',          [ObraController::class, 'index']);
    Route::get('/obras/{obra}',   [ObraController::class, 'show']);
    Route::post('/obras',         [ObraController::class, 'store']);
    Route::put('/obras/{obra}',   [ObraController::class, 'update']);

    // RF-022 — Pedido de Compra
    Route::get('/pedidos-compra',                    [PedidoCompraController::class, 'index']);
    Route::get('/pedidos-compra/{pedidoCompra}',      [PedidoCompraController::class, 'show']);
    Route::post('/pedidos-compra',                    [PedidoCompraController::class, 'store']);
    Route::put('/pedidos-compra/{pedidoCompra}',       [PedidoCompraController::class, 'update']);
    Route::patch('/pedidos-compra/{pedidoCompra}/status', [PedidoCompraController::class, 'updateStatus']);

    // RF-025 — Débitos de Manutenção
    Route::get('/debitos',              [DebitoManutencaoController::class, 'index']);
    Route::post('/debitos',             [DebitoManutencaoController::class, 'store']);
    Route::patch('/debitos/{debito}/pagar', [DebitoManutencaoController::class, 'pagar']);

    // RF-023 — Segurança & EPI
    Route::get('/epi',          [EpiRegistroController::class, 'index']);
    Route::post('/epi',         [EpiRegistroController::class, 'store']);
    Route::put('/epi/{epi}',    [EpiRegistroController::class, 'update']);

    // RF-020 — Suprimentos KOBO
    Route::get('/kobo/suprimentos', [KoboController::class, 'suprimentos']);
    Route::get('/kobo/compras',     [KoboController::class, 'compras']);

    // RF-026 — Segurança de Dados (Admin do Almoxarifado ou da Engenharia, checado no controller)
    Route::get('/sistema/status',    [SistemaController::class, 'status']);
    Route::get('/sistema/historico', [SistemaController::class, 'historico']);
    Route::get('/sistema/backup',    [SistemaController::class, 'backup']);

    // RF-028 — Catálogo de Materiais de Obra
    Route::get('/materiais-obra',                   [MaterialObraController::class, 'index']);
    Route::post('/materiais-obra',                   [MaterialObraController::class, 'store']);
    Route::post('/materiais-obra/importar',          [MaterialObraController::class, 'importar']);
    Route::put('/materiais-obra/{materiaisObra}',    [MaterialObraController::class, 'update']);

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

    // A responsabilidade exigida depende do setor do pedido — checado no controller
    // (ALMOXARIFADO não passa pela Manutenção, quem aprova é o próprio aprovador de Suprimentos).
    Route::post('/pedidos-orcamento/{pedidoOrcamento}/aprovar-manutencao',
        [PedidoOrcamentoController::class, 'aprovarManutencao']
    );

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
    )->middleware('papel:op_manutencao,admin_manutencao,op_engenharia,admin_engenharia,almoxarife');

    Route::post('/pedidos-orcamento/{pedidoOrcamento}/confirmar-retirada',
        [PedidoOrcamentoController::class, 'confirmarRetirada']
    )->middleware('papel:op_manutencao,admin_manutencao,op_engenharia,admin_engenharia');

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

    // Requisição de Almoxarifado — Engenharia/Manutenção pedem item já
    // existente em estoque (EPI, ferramenta, consumível); Almoxarifado
    // aprova (não debita) e só debita de verdade ao confirmar a separação.
    // "Enviar" (solicitante) e "receber" (aprovador) são responsabilidades
    // configuráveis por usuário — não fixas por papel/setor (RN-002.2).
    Route::get('/requisicoes-almoxarifado/produtos-disponiveis', [RequisicaoAlmoxarifadoController::class, 'produtosDisponiveis']);
    Route::get('/requisicoes-almoxarifado', [RequisicaoAlmoxarifadoController::class, 'index']);
    Route::get('/requisicoes-almoxarifado/{requisicao}', [RequisicaoAlmoxarifadoController::class, 'show']);

    Route::post('/requisicoes-almoxarifado', [RequisicaoAlmoxarifadoController::class, 'store'])
        ->middleware('responsabilidade:requisicao_almoxarifado,solicitante');

    Route::post('/requisicoes-almoxarifado/{requisicao}/aprovar',
        [RequisicaoAlmoxarifadoController::class, 'aprovar']
    )->middleware('responsabilidade:requisicao_almoxarifado,aprovador');

    Route::post('/requisicoes-almoxarifado/{requisicao}/rejeitar',
        [RequisicaoAlmoxarifadoController::class, 'rejeitar']
    )->middleware('responsabilidade:requisicao_almoxarifado,aprovador');

    Route::post('/requisicoes-almoxarifado/{requisicao}/cancelar',
        [RequisicaoAlmoxarifadoController::class, 'cancelar']
    )->middleware('responsabilidade:requisicao_almoxarifado,aprovador');

    Route::post('/requisicoes-almoxarifado/{requisicao}/confirmar-separacao',
        [RequisicaoAlmoxarifadoController::class, 'confirmarSeparacao']
    )->middleware('responsabilidade:requisicao_almoxarifado,aprovador');
});
