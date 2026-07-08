<?php

namespace Tests\Feature;

use App\Models\Produto;
use App\Models\ProdutoVariacao;
use App\Models\Setor;
use App\Models\User;
use Database\Seeders\SetorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DevolucaoTest extends TestCase
{
    use RefreshDatabase;

    private User $usuario;
    private ProdutoVariacao $variacao;
    private string $numeroPedidoOrigem;

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
        $produto = Produto::create(['codigo_produto' => 'CAP-001', 'nome' => 'Capacete', 'categoria' => 'EPI', 'unid' => 'UNID']);
        $this->variacao = $produto->variacoes()->create(['marca' => '3M', 'preco' => 25, 'estoque' => 10]);

        $this->numeroPedidoOrigem = $this->actingAs($this->usuario)->postJson('/api/saidas', [
            'tipo' => 'SAÍDA', 'tipo_saida' => 'Retirada', 'equipe' => 'Equipe 02',
            'entregador' => 'Ana', 'resp_almox' => 'Bia', 'almoxarifado' => 'Almox Central', 'data' => '2026-07-07',
            'itens' => [['codigo' => 'CAP-001', 'variacao_id' => $this->variacao->id, 'nome' => 'Capacete', 'unid' => 'UNID', 'qtd' => 6, 'destino' => 'Para a Equipe']],
        ])->json('data.numero_pedido');
    }

    public function test_devolve_itens_bons_e_nao_devolve_estoque_de_danificados(): void
    {
        $this->variacao->refresh();
        $this->assertEquals(4, $this->variacao->estoque);

        $this->actingAs($this->usuario)->postJson('/api/devolucoes', [
            'numero_pedido_origem' => $this->numeroPedidoOrigem, 'motivo' => 'Sobrou material', 'responsavel' => 'Bia', 'data' => '2026-07-07',
            'itens' => [
                ['codigo' => 'CAP-001', 'variacao_id' => $this->variacao->id, 'nome' => 'Capacete', 'unid' => 'UNID', 'qtd_dev' => 2, 'danificado' => false],
                ['codigo' => 'CAP-001', 'variacao_id' => $this->variacao->id, 'nome' => 'Capacete', 'unid' => 'UNID', 'qtd_dev' => 2, 'danificado' => true],
            ],
        ])->assertStatus(201);

        $this->variacao->refresh();
        $this->assertEquals(6, $this->variacao->estoque, '4 + 2 boas devolvidas = 6 (as 2 danificadas não voltam)');
    }

    public function test_nao_permite_devolver_mais_que_a_quantidade_original(): void
    {
        $this->actingAs($this->usuario)->postJson('/api/devolucoes', [
            'numero_pedido_origem' => $this->numeroPedidoOrigem, 'motivo' => 'X', 'responsavel' => 'Bia', 'data' => '2026-07-07',
            'itens' => [['codigo' => 'CAP-001', 'variacao_id' => $this->variacao->id, 'nome' => 'Capacete', 'unid' => 'UNID', 'qtd_dev' => 999]],
        ])->assertStatus(422);
    }

    public function test_exige_pedido_de_origem_existente(): void
    {
        $this->actingAs($this->usuario)->postJson('/api/devolucoes', [
            'numero_pedido_origem' => 'NAO-EXISTE', 'motivo' => 'X', 'responsavel' => 'Bia', 'data' => '2026-07-07',
            'itens' => [['codigo' => 'CAP-001', 'nome' => 'Capacete', 'qtd_dev' => 1]],
        ])->assertStatus(422);
    }
}
