<?php

namespace Tests\Feature;

use App\Models\Setor;
use App\Models\User;
use Database\Seeders\SetorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MaterialObraTest extends TestCase
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

    public function test_cria_lista_e_nao_permite_codigo_duplicado(): void
    {
        $criado = $this->actingAs($this->usuario)->postJson('/api/materiais-obra', [
            'codigo' => 'con-001', 'nome' => 'Concreto Usinado fck25', 'categoria' => 'Concreto', 'unidade' => 'M³',
        ])->assertStatus(201)->json('data');

        $this->assertSame('CON-001', $criado['codigo']);

        $this->actingAs($this->usuario)
            ->postJson('/api/materiais-obra', ['codigo' => 'CON-001', 'nome' => 'X', 'categoria' => 'Concreto'])
            ->assertStatus(422);

        $this->actingAs($this->usuario)->getJson('/api/materiais-obra')->assertJsonCount(1, 'data.data');
    }

    public function test_importacao_em_lote_ignora_codigos_ja_existentes(): void
    {
        $this->actingAs($this->usuario)->postJson('/api/materiais-obra', [
            'codigo' => 'CON-001', 'nome' => 'Concreto', 'categoria' => 'Concreto',
        ]);

        $this->actingAs($this->usuario)
            ->postJson('/api/materiais-obra/importar', [
                'itens' => [
                    ['codigo' => 'CON-001', 'nome' => 'Duplicado', 'categoria' => 'Concreto'],
                    ['codigo' => 'ALV-001', 'nome' => 'Tijolo Cerâmico', 'categoria' => 'Alvenaria', 'unidade' => 'PC'],
                ],
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.importados', 1);

        $this->actingAs($this->usuario)->getJson('/api/materiais-obra')->assertJsonCount(2, 'data.data');
    }

    public function test_inativa_material(): void
    {
        $criado = $this->actingAs($this->usuario)->postJson('/api/materiais-obra', [
            'codigo' => 'CON-002', 'nome' => 'Concreto', 'categoria' => 'Concreto',
        ])->json('data');

        $this->actingAs($this->usuario)
            ->putJson("/api/materiais-obra/{$criado['id']}", ['status' => 'INATIVO'])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'INATIVO');
    }
}
