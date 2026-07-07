<?php

namespace Tests\Feature;

use App\Models\Setor;
use App\Models\User;
use Database\Seeders\SetorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProdutoVeiculoTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $operador;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(SetorSeeder::class);
        $setor = Setor::where('codigo', Setor::ALMOXARIFADO)->firstOrFail();

        $this->admin = User::create([
            'nome' => 'Admin Teste', 'login' => 'admin.teste', 'email' => 'admin.teste@teste.com',
            'password' => bcrypt('123456'), 'nivel' => 'ADMIN', 'setor_id' => $setor->id, 'ativo' => true,
            'papel' => 'admin_geral',
        ]);
        $this->operador = User::create([
            'nome' => 'Operador Teste', 'login' => 'operador.teste', 'email' => 'operador.teste@teste.com',
            'password' => bcrypt('123456'), 'nivel' => 'OPERADOR', 'setor_id' => $setor->id, 'ativo' => true,
            'papel' => 'almoxarife',
        ]);
    }

    public function test_operador_nao_pode_criar_produto_mas_admin_pode(): void
    {
        $payload = [
            'codigo_produto' => 'MTR-001', 'nome' => 'Óleo 15w40', 'categoria' => 'ÓLEOS', 'unid' => 'LITROS',
            'variacoes' => [['marca' => 'Lubrax', 'preco' => 20, 'estoque' => 50]],
        ];

        $this->actingAs($this->operador)
            ->postJson('/api/produtos', $payload)
            ->assertStatus(403);

        $this->actingAs($this->admin)
            ->postJson('/api/produtos', $payload)
            ->assertStatus(201)
            ->assertJsonPath('data.codigo_produto', 'MTR-001');
    }

    public function test_produto_pode_ser_atualizado_por_id_ou_por_codigo(): void
    {
        $criado = $this->actingAs($this->admin)->postJson('/api/produtos', [
            'codigo_produto' => 'MTR-002', 'nome' => 'Graxa', 'categoria' => 'GRAXAS', 'unid' => 'KG',
            'variacoes' => [['marca' => 'X', 'preco' => 10, 'estoque' => 1]],
        ])->json('data');
        $variacaoId = $criado['variacoes'][0]['id'];

        $this->actingAs($this->admin)
            ->putJson("/api/produtos/{$criado['id']}", ['variacoes' => [['id' => $variacaoId, 'marca' => 'X', 'preco' => 10, 'estoque' => 10]]])
            ->assertStatus(200)
            ->assertJsonPath('data.estoque_total', 10);

        $this->actingAs($this->admin)
            ->putJson('/api/produtos/MTR-002', ['variacoes' => [['id' => $variacaoId, 'marca' => 'X', 'preco' => 10, 'estoque' => 20]]])
            ->assertStatus(200)
            ->assertJsonPath('data.estoque_total', 20);
    }

    public function test_variacoes_sao_sincronizadas_por_id_preservando_o_que_continua(): void
    {
        $criado = $this->actingAs($this->admin)->postJson('/api/produtos', [
            'codigo_produto' => 'FLT-001', 'nome' => 'Filtro de Óleo Motor X', 'categoria' => 'FILTROS', 'unid' => 'UNID',
            'variacoes' => [
                ['marca' => 'WEGA', 'codigo_fabricante' => 'FCD4000', 'preco' => 15.5, 'estoque' => 10],
                ['marca' => 'TECFIL', 'codigo_fabricante' => 'PSC706', 'preco' => 18, 'estoque' => 5],
            ],
        ])->json('data');

        $this->assertEquals(15, $criado['estoque_total']);
        $this->assertEquals(245, $criado['valor_total']);

        $idWega = $criado['variacoes'][0]['id'];

        // Mantém WEGA (pelo id, com dados atualizados), remove TECFIL, adiciona BOSCH nova
        $atualizado = $this->actingAs($this->admin)->putJson("/api/produtos/{$criado['id']}", [
            'variacoes' => [
                ['id' => $idWega, 'marca' => 'WEGA', 'codigo_fabricante' => 'FCD4000', 'preco' => 16, 'estoque' => 8],
                ['marca' => 'BOSCH', 'codigo_fabricante' => 'B999', 'preco' => 20, 'estoque' => 3],
            ],
        ])->json('data');

        $this->assertCount(2, $atualizado['variacoes']);
        $this->assertSame($idWega, $atualizado['variacoes'][0]['id']);
        $this->assertSame('WEGA', $atualizado['variacoes'][0]['marca']);
        $this->assertEquals(11, $atualizado['estoque_total']);
    }

    public function test_lista_de_produtos_retorna_formato_de_paginador_esperado_pelo_frontend(): void
    {
        $this->actingAs($this->admin)->postJson('/api/produtos', [
            'codigo_produto' => 'MTR-003', 'nome' => 'Filtro', 'categoria' => 'FILTROS', 'unid' => 'UNID',
            'variacoes' => [['marca' => 'Y', 'preco' => 5, 'estoque' => 1]],
        ]);

        $this->actingAs($this->operador)
            ->getJson('/api/produtos')
            ->assertStatus(200)
            ->assertJsonStructure(['data' => ['data', 'current_page', 'last_page', 'per_page', 'total']])
            ->assertJsonCount(1, 'data.data');
    }

    public function test_qualquer_nivel_pode_cadastrar_veiculo(): void
    {
        $this->actingAs($this->operador)
            ->postJson('/api/veiculos', ['placa' => 'ABC-1234', 'modelo' => 'Iveco Daily', 'tipo' => 'VAN'])
            ->assertStatus(201)
            ->assertJsonPath('data.placa', 'ABC-1234');
    }

    public function test_nao_permite_placa_duplicada(): void
    {
        $this->actingAs($this->admin)->postJson('/api/veiculos', ['placa' => 'XYZ-9999', 'modelo' => 'Modelo A']);

        $this->actingAs($this->admin)
            ->postJson('/api/veiculos', ['placa' => 'XYZ-9999', 'modelo' => 'Modelo B'])
            ->assertStatus(422);
    }
}
