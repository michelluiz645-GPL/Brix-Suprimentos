<?php

namespace Tests\Feature;

use App\Models\Setor;
use App\Models\User;
use Database\Seeders\SetorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ObraTest extends TestCase
{
    use RefreshDatabase;

    private User $usuario;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SetorSeeder::class);
        $setor = Setor::where('codigo', Setor::ENGENHARIA)->firstOrFail();
        $this->usuario = User::create([
            'nome' => 'Eng Teste', 'login' => 'eng.teste', 'email' => 'eng.teste@teste.com',
            'password' => bcrypt('123456'), 'nivel' => 'OPERADOR', 'setor_id' => $setor->id, 'ativo' => true,
            'papel' => 'admin_geral',
        ]);
    }

    public function test_cria_lista_filtra_e_atualiza_obra(): void
    {
        $criada = $this->actingAs($this->usuario)->postJson('/api/obras', [
            'nome' => 'Pavimentação Av. Central', 'tipo' => 'PUBLICA', 'centro_custo' => 'CC-2026-001', 'responsavel' => 'Eng. Ana',
        ])->assertStatus(201)->json('data');

        $this->assertSame('Eng Teste', $criada['criado_por']);

        $this->actingAs($this->usuario)
            ->getJson('/api/obras?status=ATIVA&tipo=PUBLICA')
            ->assertJsonCount(1, 'data.data');

        $this->actingAs($this->usuario)
            ->putJson("/api/obras/{$criada['id']}", ['status' => 'CONCLUÍDA'])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'CONCLUÍDA');
    }

    public function test_exige_centro_de_custo(): void
    {
        $this->actingAs($this->usuario)
            ->postJson('/api/obras', ['nome' => 'X'])
            ->assertStatus(422);
    }
}
