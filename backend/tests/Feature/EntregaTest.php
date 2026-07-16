<?php

namespace Tests\Feature;

use App\Models\Produto;
use App\Models\Setor;
use App\Models\User;
use Database\Seeders\SetorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EntregaTest extends TestCase
{
    use RefreshDatabase;

    private User $usuario;
    private int $variacaoId;

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
        $produto = Produto::create(['codigo_produto' => 'CIM-001', 'nome' => 'Cimento', 'categoria' => 'OUTROS', 'unid' => 'UNID']);
        $this->variacaoId = $produto->variacoes()->create(['marca' => 'Votoran', 'preco' => 30, 'estoque' => 100])->id;
    }

    private function darSaida(string $tipoSaida): void
    {
        $this->actingAs($this->usuario)->postJson('/api/saidas', [
            'tipo' => 'SAÍDA', 'tipo_saida' => $tipoSaida, 'equipe' => 'Obra Centro',
            'entregador' => 'Carlos', 'resp_almox' => 'Maria', 'almoxarifado' => 'Almox Central', 'data' => '2026-07-07',
            'itens' => [['codigo' => 'CIM-001', 'variacao_id' => $this->variacaoId, 'nome' => 'Cimento', 'unid' => 'UNID', 'qtd' => 10, 'destino' => 'Obra', 'destino_obra' => 'Obra Centro']],
        ]);
    }

    public function test_apenas_saida_tipo_entrega_aparece_como_pendente(): void
    {
        $this->darSaida('Entrega');
        $this->darSaida('Retirada');

        $this->actingAs($this->usuario)
            ->getJson('/api/entregas?status=PENDENTE')
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.status', 'PENDENTE');
    }

    public function test_confirmar_entrega_registra_confirmante_e_some_dos_pendentes(): void
    {
        $this->darSaida('Entrega');
        $id = $this->actingAs($this->usuario)->getJson('/api/entregas?status=PENDENTE')->json('data.data.0.id');

        $this->actingAs($this->usuario)
            ->postJson("/api/entregas/{$id}/confirmar", ['confirmado_por' => 'João da Obra', 'data_confirmacao' => '2026-07-08'])
            ->assertStatus(200);

        $this->actingAs($this->usuario)
            ->getJson('/api/entregas?status=PENDENTE')
            ->assertJsonCount(0, 'data.data');

        $this->actingAs($this->usuario)
            ->postJson("/api/entregas/{$id}/confirmar", ['confirmado_por' => 'Outro', 'data_confirmacao' => '2026-07-08'])
            ->assertStatus(422);
    }
}
