<?php

namespace Tests\Feature;

use App\Models\Setor;
use App\Models\User;
use Database\Seeders\SetorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EquipeTest extends TestCase
{
    use RefreshDatabase;

    private User $usuario;

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
    }

    public function test_cria_lista_e_atualiza_equipe(): void
    {
        $criada = $this->actingAs($this->usuario)->postJson('/api/equipes', [
            'nome' => 'Equipe Terraplanagem Norte', 'numero' => '01', 'centro_custo' => 'CC-2026-001', 'tipo' => 'Terraplanagem',
        ])->assertStatus(201)->json('data');

        $this->assertSame('CC-2026-001', $criada['centro_custo']);

        $this->actingAs($this->usuario)->getJson('/api/equipes')->assertJsonCount(1, 'data.data');

        $this->actingAs($this->usuario)
            ->putJson("/api/equipes/{$criada['id']}", ['responsavel' => 'Carlos'])
            ->assertStatus(200)
            ->assertJsonPath('data.responsavel', 'Carlos');
    }

    public function test_exige_tipo_de_operacao(): void
    {
        $this->actingAs($this->usuario)
            ->postJson('/api/equipes', ['nome' => 'X', 'numero' => '02'])
            ->assertStatus(422);
    }

    public function test_nao_permite_numero_duplicado(): void
    {
        $this->actingAs($this->usuario)->postJson('/api/equipes', ['nome' => 'A', 'numero' => '03', 'tipo' => 'Outro']);

        $this->actingAs($this->usuario)
            ->postJson('/api/equipes', ['nome' => 'B', 'numero' => '03', 'tipo' => 'Outro'])
            ->assertStatus(422);
    }
}
