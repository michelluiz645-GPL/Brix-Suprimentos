<?php

namespace Tests\Feature;

use App\Models\Setor;
use App\Models\User;
use Database\Seeders\SetorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EquipamentoTest extends TestCase
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

    public function test_cria_lista_e_atualiza_equipamento_com_historico_em_obs(): void
    {
        $criado = $this->actingAs($this->usuario)->postJson('/api/equipamentos', [
            'nome' => 'Retroescavadeira JD 310', 'tipo' => 'RETROESCAVADEIRA', 'serie' => 'XYZ123', 'equipe' => '01',
        ])->assertStatus(201)->json('data');

        $this->actingAs($this->usuario)->getJson('/api/equipamentos')->assertJsonCount(1, 'data.data');

        $obs = json_encode(['descricao' => '', 'movimentacoes' => [['data' => '2026-07-07', 'tipo' => 'MANUTENÇÃO', 'responsavel' => 'Carlos', 'obs' => 'Troca de óleo']]]);

        $this->actingAs($this->usuario)
            ->putJson("/api/equipamentos/{$criado['id']}", ['obs' => $obs])
            ->assertStatus(200)
            ->assertJsonPath('data.obs', $obs);
    }
}
