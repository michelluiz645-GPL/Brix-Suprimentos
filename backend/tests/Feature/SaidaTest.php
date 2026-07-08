<?php

namespace Tests\Feature;

use App\Models\Produto;
use App\Models\ProdutoVariacao;
use App\Models\Setor;
use App\Models\User;
use Database\Seeders\SetorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SaidaTest extends TestCase
{
    use RefreshDatabase;

    private User $operador;
    private User $admin;
    private Produto $produto;
    private ProdutoVariacao $variacao;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SetorSeeder::class);
        $setor = Setor::where('codigo', Setor::ALMOXARIFADO)->firstOrFail();
        $this->operador = User::create([
            'nome' => 'Operador', 'login' => 'operador.teste', 'email' => 'operador.teste@teste.com',
            'password' => bcrypt('123456'), 'nivel' => 'OPERADOR', 'setor_id' => $setor->id, 'ativo' => true,
            'papel' => 'almoxarife',
        ]);
        $this->admin = User::create([
            'nome' => 'Admin', 'login' => 'admin.teste', 'email' => 'admin.teste@teste.com',
            'password' => bcrypt('123456'), 'nivel' => 'ADMIN', 'setor_id' => $setor->id, 'ativo' => true,
            'papel' => 'admin_geral',
        ]);
        $this->produto = Produto::create([
            'codigo_produto' => 'LUV-001', 'nome' => 'Luva de Proteção', 'categoria' => 'EPI', 'unid' => 'UNID',
        ]);
        $this->variacao = $this->produto->variacoes()->create(['marca' => '3M', 'preco' => 10, 'estoque' => 20]);
    }

    private function payloadSaida(int $qtd): array
    {
        return [
            'tipo' => 'SAÍDA', 'tipo_saida' => 'Retirada', 'equipe' => 'Equipe 01', 'colaborador' => 'Pedro',
            'entregador' => 'João', 'resp_almox' => 'Maria', 'almoxarifado' => 'Almox Central', 'data' => '2026-07-07',
            'itens' => [['codigo' => 'LUV-001', 'variacao_id' => $this->variacao->id, 'nome' => 'Luva de Proteção', 'unid' => 'UNID', 'qtd' => $qtd, 'destino' => 'Para a Equipe']],
        ];
    }

    public function test_registra_saida_baixa_estoque_e_aparece_no_historico(): void
    {
        $this->actingAs($this->operador)
            ->postJson('/api/saidas', $this->payloadSaida(5))
            ->assertStatus(201)
            ->assertJsonPath('data.numero_pedido', 'MOV-SAÍDA-2026-0001');

        $this->variacao->refresh();
        $this->assertEquals(15, $this->variacao->estoque);

        $this->actingAs($this->operador)
            ->getJson('/api/saidas/cupons')
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.status', 'ATIVO');
    }

    public function test_destino_frota_exige_placa(): void
    {
        $payload = $this->payloadSaida(1);
        $payload['itens'][0]['destino'] = 'Frota';

        $this->actingAs($this->operador)
            ->postJson('/api/saidas', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['itens.0.destino_frota']);

        $payload['itens'][0]['destino_frota'] = 'ABC-1234';

        $this->actingAs($this->operador)
            ->postJson('/api/saidas', $payload)
            ->assertStatus(201);
    }

    public function test_nao_permite_saida_maior_que_estoque_disponivel(): void
    {
        $this->actingAs($this->operador)
            ->postJson('/api/saidas', $this->payloadSaida(999))
            ->assertStatus(422);

        $this->variacao->refresh();
        $this->assertEquals(20, $this->variacao->estoque, 'Estoque não deve mudar quando a saída falha.');
    }

    public function test_apenas_admin_pode_cancelar_e_estorno_devolve_estoque(): void
    {
        $numeroPedido = $this->actingAs($this->operador)
            ->postJson('/api/saidas', $this->payloadSaida(5))
            ->json('data.numero_pedido');

        $this->actingAs($this->operador)
            ->postJson("/api/saidas/cupons/{$numeroPedido}/cancelar")
            ->assertStatus(403);

        $this->actingAs($this->admin)
            ->postJson("/api/saidas/cupons/{$numeroPedido}/cancelar")
            ->assertStatus(200);

        $this->variacao->refresh();
        $this->assertEquals(20, $this->variacao->estoque, 'Estorno deve devolver o estoque ao valor original.');

        $this->actingAs($this->admin)
            ->postJson("/api/saidas/cupons/{$numeroPedido}/cancelar")
            ->assertStatus(422);
    }
}
