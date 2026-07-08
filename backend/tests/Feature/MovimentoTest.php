<?php

namespace Tests\Feature;

use App\Models\Produto;
use App\Models\ProdutoVariacao;
use App\Models\Setor;
use App\Models\User;
use Database\Seeders\SetorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MovimentoTest extends TestCase
{
    use RefreshDatabase;

    private User $usuario;
    private Produto $produto;
    private ProdutoVariacao $variacao;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SetorSeeder::class);
        $setor = Setor::where('codigo', Setor::ALMOXARIFADO)->firstOrFail();
        $this->usuario = User::create([
            'nome' => 'Usuário Teste', 'login' => 'usuario.teste', 'email' => 'usuario.teste@teste.com',
            'password' => bcrypt('123456'), 'nivel' => 'OPERADOR', 'setor_id' => $setor->id, 'ativo' => true,
            'papel' => 'almoxarife',
        ]);
        $this->produto = Produto::create([
            'codigo_produto' => 'FLT-002', 'nome' => 'Filtro de Ar', 'categoria' => 'FILTROS', 'unid' => 'UNID',
        ]);
        $this->variacao = $this->produto->variacoes()->create(['marca' => 'Mann', 'preco' => 30, 'estoque' => 5]);
    }

    public function test_entrada_em_lote_soma_estoque_e_atualiza_preco_por_variacao(): void
    {
        $this->actingAs($this->usuario)->postJson('/api/movimentos', [
            'tipo' => 'ENTRADA', 'numero_nf' => 'NF123', 'data' => '2026-07-07',
            'fornecedor' => 'Mann Filtros', 'almoxarifado' => 'Almox Central', 'responsavel' => 'João',
            'itens' => [
                ['codigo' => 'FLT-002', 'variacao_id' => $this->variacao->id, 'nome' => 'Filtro de Ar', 'unid' => 'UNID', 'qtd' => 10, 'preco' => 32],
            ],
        ])->assertStatus(201)->assertJsonPath('data.numero_pedido', 'MOV-ENTRADA-2026-0001');

        $this->variacao->refresh();
        $this->assertEquals(15, $this->variacao->estoque);
        $this->assertEquals(32, $this->variacao->preco);

        $this->actingAs($this->usuario)->getJson('/api/movimentos')->assertJsonCount(1, 'data.data');
    }

    public function test_entrada_exige_variacao_selecionada(): void
    {
        $this->actingAs($this->usuario)->postJson('/api/movimentos', [
            'tipo' => 'ENTRADA', 'data' => '2026-07-07', 'almoxarifado' => 'Almox',
            'itens' => [['codigo' => 'FLT-002', 'nome' => 'Filtro de Ar', 'qtd' => 5]],
        ])->assertStatus(422);

        $this->variacao->refresh();
        $this->assertEquals(5, $this->variacao->estoque, 'Estoque não deve mudar quando a entrada falha.');
    }

    public function test_ajuste_avulso_nao_mexe_em_estoque_so_registra_no_ledger(): void
    {
        $this->actingAs($this->usuario)->postJson('/api/movimentos', [
            'tipo' => 'AJUSTE', 'codigo' => 'FLT-002', 'nome' => 'Filtro de Ar', 'unid' => 'UNID',
            'qtd' => -2, 'preco' => 32, 'almoxarifado' => 'Almox Central', 'responsavel' => 'João',
            'data' => '2026-07-07', 'obs' => 'Inventário', 'usuario' => 'João',
        ])->assertStatus(201);

        $this->variacao->refresh();
        $this->assertEquals(5, $this->variacao->estoque, 'AJUSTE avulso não deve alterar o estoque — Inventário ajusta via /produtos.');
    }
}
