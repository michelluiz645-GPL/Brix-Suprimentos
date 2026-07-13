<?php

namespace Tests\Feature;

use App\Models\Setor;
use App\Models\User;
use Database\Seeders\SetorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CombustivelTest extends TestCase
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

    public function test_entrada_e_abastecimento_atualizam_saldo_corretamente(): void
    {
        $this->actingAs($this->usuario)->postJson('/api/combustiveis', [
            'tipo' => 'ENTRADA', 'combustivel' => 'DIESEL S10', 'quantidade' => 1000,
            'valor_litro' => 5.5, 'fornecedor' => 'Posto XYZ', 'responsavel' => 'João', 'data' => '2026-07-07',
        ])->assertStatus(201);

        $this->actingAs($this->usuario)
            ->getJson('/api/combustiveis/saldo')
            ->assertJsonPath('data.data.DIESEL S10', 1000);

        $this->actingAs($this->usuario)->postJson('/api/combustiveis', [
            'tipo' => 'ABASTECIMENTO', 'combustivel' => 'DIESEL S10', 'quantidade' => 200,
            'frota' => 'ABC-1234', 'responsavel' => 'Carlos', 'data' => '2026-07-07',
        ])->assertStatus(201);

        $this->actingAs($this->usuario)
            ->getJson('/api/combustiveis/saldo')
            ->assertJsonPath('data.data.DIESEL S10', 800);
    }

    public function test_abastecimento_calcula_valor_pelo_preco_da_ultima_entrada(): void
    {
        $this->actingAs($this->usuario)->postJson('/api/combustiveis', [
            'tipo' => 'ENTRADA', 'combustivel' => 'DIESEL S10', 'quantidade' => 1000,
            'valor_litro' => 5.5, 'fornecedor' => 'Posto XYZ', 'responsavel' => 'João', 'data' => '2026-07-01',
        ]);

        // Entrada mais recente com preço diferente — o abastecimento deve usar ESTA, não a primeira.
        $this->actingAs($this->usuario)->postJson('/api/combustiveis', [
            'tipo' => 'ENTRADA', 'combustivel' => 'DIESEL S10', 'quantidade' => 500,
            'valor_litro' => 6, 'fornecedor' => 'Posto ABC', 'responsavel' => 'João', 'data' => '2026-07-05',
        ]);

        $resp = $this->actingAs($this->usuario)->postJson('/api/combustiveis', [
            'tipo' => 'ABASTECIMENTO', 'combustivel' => 'DIESEL S10', 'quantidade' => 100,
            'frota' => 'ABC-1234', 'responsavel' => 'Carlos', 'data' => '2026-07-07',
        ])->assertStatus(201);

        $this->assertEquals(600, (float) $resp->json('data.valor')); // 100L × R$6,00
    }

    public function test_nao_permite_abastecer_alem_do_saldo(): void
    {
        $this->actingAs($this->usuario)->postJson('/api/combustiveis', [
            'tipo' => 'ENTRADA', 'combustivel' => 'GASOLINA', 'quantidade' => 100,
            'valor_litro' => 6, 'fornecedor' => 'Posto XYZ', 'responsavel' => 'João', 'data' => '2026-07-07',
        ]);

        $this->actingAs($this->usuario)
            ->postJson('/api/combustiveis', [
                'tipo' => 'ABASTECIMENTO', 'combustivel' => 'GASOLINA', 'quantidade' => 999,
                'frota' => 'XYZ-0000', 'responsavel' => 'Carlos', 'data' => '2026-07-07',
            ])
            ->assertStatus(422);
    }

    public function test_exige_fornecedor_na_entrada_e_destino_no_abastecimento(): void
    {
        $this->actingAs($this->usuario)
            ->postJson('/api/combustiveis', [
                'tipo' => 'ENTRADA', 'combustivel' => 'GASOLINA', 'quantidade' => 100,
                'responsavel' => 'João', 'data' => '2026-07-07',
            ])
            ->assertStatus(422);

        $this->actingAs($this->usuario)
            ->postJson('/api/combustiveis', [
                'tipo' => 'ABASTECIMENTO', 'combustivel' => 'GASOLINA', 'quantidade' => 10,
                'responsavel' => 'João', 'data' => '2026-07-07',
            ])
            ->assertStatus(422);
    }
}
