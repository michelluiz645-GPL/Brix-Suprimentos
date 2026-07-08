<?php

namespace Tests\Feature;

use App\Models\Setor;
use App\Models\User;
use Database\Seeders\SetorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FuncionarioTest extends TestCase
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

    public function test_cria_lista_e_atualiza_funcionario(): void
    {
        $criado = $this->actingAs($this->usuario)->postJson('/api/funcionarios', [
            'nome' => 'João Silva', 'funcao' => 'Operador', 'cpf' => '12345678900',
        ])->assertStatus(201)->json('data');

        $this->actingAs($this->usuario)
            ->getJson('/api/funcionarios')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data.data');

        $this->actingAs($this->usuario)
            ->putJson("/api/funcionarios/{$criado['id']}", ['status' => 'INATIVO', 'demitido' => true])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'INATIVO')
            ->assertJsonPath('data.demitido', true);
    }

    public function test_nao_permite_cpf_duplicado(): void
    {
        $this->actingAs($this->usuario)->postJson('/api/funcionarios', ['nome' => 'A', 'funcao' => 'X', 'cpf' => '111']);

        $this->actingAs($this->usuario)
            ->postJson('/api/funcionarios', ['nome' => 'B', 'funcao' => 'Y', 'cpf' => '111'])
            ->assertStatus(422);
    }

    public function test_filtra_por_status(): void
    {
        $this->actingAs($this->usuario)->postJson('/api/funcionarios', ['nome' => 'Ativo', 'funcao' => 'X']);
        $this->actingAs($this->usuario)->postJson('/api/funcionarios', ['nome' => 'Inativo', 'funcao' => 'Y', 'status' => 'INATIVO']);

        $this->actingAs($this->usuario)
            ->getJson('/api/funcionarios?status=INATIVO')
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.nome', 'Inativo');
    }
}
