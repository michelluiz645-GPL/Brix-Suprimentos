<?php

namespace Tests\Feature;

use App\Models\Setor;
use App\Models\User;
use Database\Seeders\SetorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EpiRegistroTest extends TestCase
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

    public function test_cria_lista_e_atualiza_registro_de_epi(): void
    {
        $criado = $this->actingAs($this->usuario)->postJson('/api/epi', [
            'funcionario' => 'Carlos', 'epi' => 'CAPACETE', 'data_entrega' => '2026-07-07',
            'proxima_troca' => '2026-08-01', 'responsavel' => 'Maria',
        ])->assertStatus(201)->json('data');

        $this->actingAs($this->usuario)->getJson('/api/epi')->assertJsonCount(1, 'data.data');

        $this->actingAs($this->usuario)
            ->putJson("/api/epi/{$criado['id']}", ['proxima_troca' => '2026-09-01'])
            ->assertStatus(200)
            ->assertJsonPath('data.proxima_troca', '2026-09-01');
    }

    public function test_exige_funcionario_proxima_troca_e_responsavel(): void
    {
        $this->actingAs($this->usuario)
            ->postJson('/api/epi', ['epi' => 'LUVAS'])
            ->assertStatus(422);
    }
}
