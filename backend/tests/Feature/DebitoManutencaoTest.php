<?php

namespace Tests\Feature;

use App\Models\Produto;
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

    public function test_gasto_epi_aparece_separado_e_nao_entra_no_total_devido(): void
    {
        $produto = Produto::create([
            'codigo_produto' => 'LUV-001', 'nome' => 'Luva de Proteção', 'categoria' => 'EPI', 'unid' => 'UNID',
        ]);
        $variacao = $produto->variacoes()->create(['marca' => '3M', 'preco' => 15, 'estoque' => 20]);

        $this->actingAs($this->operador)->postJson('/api/saidas', [
            'tipo' => 'SAÍDA', 'tipo_saida' => 'Retirada', 'equipe' => 'Equipe 01', 'colaborador' => 'Pedro',
            'entregador' => 'João', 'resp_almox' => 'Maria', 'almoxarifado' => 'Almox Central', 'data' => '2026-07-14',
            'itens' => [['codigo' => 'LUV-001', 'variacao_id' => $variacao->id, 'nome' => 'Luva de Proteção', 'unid' => 'UNID', 'qtd' => 2, 'destino' => 'Manutenção', 'colaborador_epi' => 'Carlos']],
        ])->assertStatus(201);

        $resp = $this->actingAs($this->operador)->getJson('/api/debitos')->json('data');

        $this->assertSame(0, $resp['total'], 'EPI não deve gerar nenhum débito cobrado.');
        $this->assertEquals(30, $resp['gasto_epi']); // 2 × R$15
    }

    public function test_filtro_de_periodo_afeta_debitos_e_gasto_epi_igualmente(): void
    {
        $produto = Produto::create([
            'codigo_produto' => 'LUV-002', 'nome' => 'Óculos de Proteção', 'categoria' => 'EPI', 'unid' => 'UNID',
        ]);
        $variacao = $produto->variacoes()->create(['marca' => '3M', 'preco' => 10, 'estoque' => 20]);

        // Um débito e uma saída de EPI dentro do período, outro par fora.
        $this->actingAs($this->operador)->postJson('/api/debitos', [
            'data' => '2026-06-01', 'equipe' => '01', 'registrado_por' => 'Carlos',
            'itens' => [['nome' => 'Óleo', 'qtd' => 1, 'unid' => 'L', 'preco' => 100]],
        ]);
        $this->actingAs($this->operador)->postJson('/api/debitos', [
            'data' => '2026-07-15', 'equipe' => '01', 'registrado_por' => 'Carlos',
            'itens' => [['nome' => 'Óleo', 'qtd' => 1, 'unid' => 'L', 'preco' => 50]],
        ]);

        $this->actingAs($this->operador)->postJson('/api/saidas', [
            'tipo' => 'SAÍDA', 'tipo_saida' => 'Retirada', 'equipe' => 'Equipe 01', 'colaborador' => 'Pedro',
            'entregador' => 'João', 'resp_almox' => 'Maria', 'almoxarifado' => 'Almox Central', 'data' => '2026-06-01',
            'itens' => [['codigo' => 'LUV-002', 'variacao_id' => $variacao->id, 'nome' => 'Óculos de Proteção', 'unid' => 'UNID', 'qtd' => 1, 'destino' => 'Para a Equipe', 'colaborador_epi' => 'Carlos']],
        ]);

        $resp = $this->actingAs($this->operador)
            ->getJson('/api/debitos?data_de=2026-07-01&data_ate=2026-07-31')
            ->json('data');

        $this->assertSame(1, $resp['total'], 'Só o débito de julho deve entrar no período filtrado.');
        $this->assertEquals(0, $resp['gasto_epi'], 'A saída de EPI foi em junho, fora do período — não deve contar.');
    }
}
