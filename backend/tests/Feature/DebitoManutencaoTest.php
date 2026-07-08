<?php

namespace Tests\Feature;

use App\Models\Setor;
use App\Models\User;
use Database\Seeders\SetorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DebitoManutencaoTest extends TestCase
{
    use RefreshDatabase;

    private User $operador;
    private User $admin;

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
    }

    public function test_cria_debito_calcula_total_e_lista_por_status(): void
    {
        $debito = $this->actingAs($this->operador)->postJson('/api/debitos', [
            'data' => '2026-07-07', 'equipe' => '01', 'nome_equipe' => 'Equipe Manutenção', 'registrado_por' => 'Carlos',
            'itens' => [['nome' => 'Óleo', 'qtd' => 5, 'unid' => 'L', 'preco' => 20]],
        ])->assertStatus(201)->json('data');

        $this->assertEquals(100, $debito['total']);
        $this->assertSame('ABERTO', $debito['status']);

        $this->actingAs($this->operador)
            ->getJson('/api/debitos?status=ABERTO')
            ->assertJsonCount(1, 'data.data');
    }

    public function test_apenas_admin_marca_como_pago_e_nao_permite_pagar_duas_vezes(): void
    {
        $id = $this->actingAs($this->operador)->postJson('/api/debitos', [
            'data' => '2026-07-07', 'equipe' => '01', 'registrado_por' => 'Carlos',
            'itens' => [['nome' => 'Óleo', 'qtd' => 5, 'unid' => 'L', 'preco' => 20]],
        ])->json('data.id');

        $this->actingAs($this->operador)
            ->patchJson("/api/debitos/{$id}/pagar")
            ->assertStatus(403);

        $this->actingAs($this->admin)
            ->patchJson("/api/debitos/{$id}/pagar")
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'PAGO');

        $this->actingAs($this->admin)
            ->patchJson("/api/debitos/{$id}/pagar")
            ->assertStatus(422);
    }
}
