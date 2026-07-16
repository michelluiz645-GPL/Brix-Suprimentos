<?php

namespace Tests\Feature;

use App\Models\Equipe;
use App\Models\Produto;
use App\Models\ProdutoVariacao;
use App\Models\Setor;
use App\Models\User;
use Database\Seeders\SetorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SaidaTest extends TestCase
{
    use RefreshDatabase;

    private User $operador;
    private User $admin;
    private Produto $produto;
    private ProdutoVariacao $variacao;
    private Produto $produtoPeca;
    private ProdutoVariacao $variacaoPeca;

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
        $this->produto = Produto::create([
            'codigo_produto' => 'LUV-001', 'nome' => 'Luva de Proteção', 'categoria' => 'EPI', 'unid' => 'UNID',
            'dias_validade_epi' => 90,
        ]);
        $this->variacao = $this->produto->variacoes()->create(['marca' => '3M', 'preco' => 10, 'estoque' => 20]);

        $this->produtoPeca = Produto::create([
            'codigo_produto' => 'PEC-001', 'nome' => 'Filtro de Óleo', 'categoria' => 'Peças Motor', 'unid' => 'UNID',
        ]);
        $this->variacaoPeca = $this->produtoPeca->variacoes()->create(['marca' => 'Fram', 'preco' => 45, 'estoque' => 20]);
    }

    private function payloadSaida(int $qtd): array
    {
        return [
            'tipo' => 'SAÍDA', 'tipo_saida' => 'Retirada', 'equipe' => 'Equipe 01', 'colaborador' => 'Pedro',
            'entregador' => 'João', 'resp_almox' => 'Maria', 'almoxarifado' => 'Almox Central', 'data' => '2026-07-07',
            'itens' => [['codigo' => 'LUV-001', 'variacao_id' => $this->variacao->id, 'nome' => 'Luva de Proteção', 'unid' => 'UNID', 'qtd' => $qtd, 'destino' => 'Para a Equipe', 'colaborador_epi' => 'Carlos Souza']],
        ];
    }

    public function test_registra_saida_baixa_estoque_e_aparece_no_historico(): void
    {
        $this->actingAs($this->operador)
            ->postJson('/api/saidas', $this->payloadSaida(5))
            ->assertStatus(201)
            ->assertJsonPath('data.numero_pedido', 'MOV-SAÍDA-2026-0001');

        $this->variacao->refresh();
        $this->assertEquals(15, $this->variacao->estoque);

        $this->actingAs($this->operador)
            ->getJson('/api/saidas/cupons')
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.status', 'ATIVO');
    }

    public function test_destino_frota_exige_placa(): void
    {
        $payload = $this->payloadSaida(1);
        $payload['itens'][0]['destino'] = 'Frota';

        $this->actingAs($this->operador)
            ->postJson('/api/saidas', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['itens.0.destino_frota']);

        $payload['itens'][0]['destino_frota'] = 'ABC-1234';

        $this->actingAs($this->operador)
            ->postJson('/api/saidas', $payload)
            ->assertStatus(201);
    }

    public function test_item_epi_exige_colaborador(): void
    {
        $payload = $this->payloadSaida(1);
        unset($payload['itens'][0]['colaborador_epi']);

        $this->actingAs($this->operador)
            ->postJson('/api/saidas', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['itens.0.colaborador_epi']);
    }

    public function test_saida_de_epi_calcula_vencimento_e_gera_registro_automatico(): void
    {
        $this->actingAs($this->operador)
            ->postJson('/api/saidas', $this->payloadSaida(1))
            ->assertStatus(201);

        $movimento = \App\Models\Movimento::where('tipo', 'SAÍDA')->firstOrFail();
        $this->assertSame('Carlos Souza', $movimento->colaborador_epi);
        $this->assertSame('2026-10-05', $movimento->epi_vencimento->format('Y-m-d')); // 2026-07-07 + 90 dias

        $registro = \App\Models\EpiRegistro::firstOrFail();
        $this->assertSame('Carlos Souza', $registro->funcionario);
        $this->assertSame('Luva de Proteção', $registro->epi);
        $this->assertSame('2026-10-05', $registro->proxima_troca->format('Y-m-d'));
    }

    public function test_nao_permite_saida_maior_que_estoque_disponivel(): void
    {
        $this->actingAs($this->operador)
            ->postJson('/api/saidas', $this->payloadSaida(999))
            ->assertStatus(422);

        $this->variacao->refresh();
        $this->assertEquals(20, $this->variacao->estoque, 'Estoque não deve mudar quando a saída falha.');
    }

    public function test_apenas_admin_pode_cancelar_e_estorno_devolve_estoque(): void
    {
        $numeroPedido = $this->actingAs($this->operador)
            ->postJson('/api/saidas', $this->payloadSaida(5))
            ->json('data.numero_pedido');

        $this->actingAs($this->operador)
            ->postJson("/api/saidas/cupons/{$numeroPedido}/cancelar")
            ->assertStatus(403);

        $this->actingAs($this->admin)
            ->postJson("/api/saidas/cupons/{$numeroPedido}/cancelar")
            ->assertStatus(200);

        $this->variacao->refresh();
        $this->assertEquals(20, $this->variacao->estoque, 'Estorno deve devolver o estoque ao valor original.');

        $this->actingAs($this->admin)
            ->postJson("/api/saidas/cupons/{$numeroPedido}/cancelar")
            ->assertStatus(422);
    }

    private function payloadPeca(string $destino, int $qtd = 2): array
    {
        return [
            'tipo' => 'SAÍDA', 'tipo_saida' => 'Retirada', 'equipe' => 'Equipe 01', 'colaborador' => 'Pedro',
            'entregador' => 'João', 'resp_almox' => 'Maria', 'almoxarifado' => 'Almox Central', 'data' => '2026-07-07',
            'itens' => [['codigo' => 'PEC-001', 'variacao_id' => $this->variacaoPeca->id, 'nome' => 'Filtro de Óleo', 'unid' => 'UNID', 'qtd' => $qtd, 'destino' => $destino]],
        ];
    }

    public function test_saida_com_destino_frota_gera_debito_automatico(): void
    {
        $payload = $this->payloadPeca('Frota');
        $payload['itens'][0]['destino_frota'] = 'ABC-1234';

        $numeroPedido = $this->actingAs($this->operador)->postJson('/api/saidas', $payload)->json('data.numero_pedido');

        $debito = \App\Models\DebitoManutencao::firstOrFail();
        $this->assertSame($numeroPedido, $debito->pedido_origem);
        $this->assertSame('ABERTO', $debito->status);
        $this->assertEquals(90, (float) $debito->total); // 2 × R$45
        $this->assertCount(1, $debito->itens);
        $this->assertSame('Peças Motor', $debito->itens[0]['categoria']);
    }

    public function test_saida_com_destino_manutencao_gera_debito_automatico(): void
    {
        $this->actingAs($this->operador)->postJson('/api/saidas', $this->payloadPeca('Manutenção'));

        $this->assertSame(1, \App\Models\DebitoManutencao::count());
    }

    public function test_saida_com_destino_outro_nao_gera_debito(): void
    {
        $this->actingAs($this->operador)->postJson('/api/saidas', $this->payloadPeca('Roçada'));

        $this->assertSame(0, \App\Models\DebitoManutencao::count());
    }

    public function test_destino_obra_exige_obra_selecionada(): void
    {
        $this->actingAs($this->operador)
            ->postJson('/api/saidas', $this->payloadPeca('Obra'))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['itens.0.destino_obra']);
    }

    public function test_saida_com_destino_obra_gera_debito_com_a_obra_no_item(): void
    {
        $payload = $this->payloadPeca('Obra');
        $payload['itens'][0]['destino_obra'] = 'Obra Rodovia BR-153';

        $this->actingAs($this->operador)->postJson('/api/saidas', $payload)->assertStatus(201);

        $debito = \App\Models\DebitoManutencao::firstOrFail();
        $this->assertSame('MATERIAL', $debito->natureza);
        $this->assertSame('Obra Rodovia BR-153', $debito->itens[0]['destino_obra']);
    }

    public function test_equipe_tipo_manutencao_gera_debito_mesmo_com_outro_destino(): void
    {
        Equipe::create(['nome' => 'Equipe Manutenção 01', 'numero' => 'Equipe 01', 'tipo' => 'Manutenção']);

        $this->actingAs($this->operador)->postJson('/api/saidas', $this->payloadPeca('Para a Equipe'));

        $this->assertSame(1, \App\Models\DebitoManutencao::count());
    }

    public function test_item_epi_gera_debito_separado_com_natureza_epi_e_nao_material(): void
    {
        $payload = $this->payloadSaida(1); // produto EPI
        $payload['itens'][0]['destino'] = 'Frota';
        $payload['itens'][0]['destino_frota'] = 'ABC-1234';

        $this->actingAs($this->operador)->postJson('/api/saidas', $payload)->assertStatus(201);

        $this->assertSame(0, \App\Models\DebitoManutencao::where('natureza', 'MATERIAL')->count(), 'EPI não pode virar débito cobrado (MATERIAL).');

        $debitoEpi = \App\Models\DebitoManutencao::where('natureza', 'EPI')->firstOrFail();
        $this->assertEquals(10, (float) $debitoEpi->total); // 1 × R$10
        $this->assertSame('EPI', $debitoEpi->itens[0]['categoria']);
    }

    public function test_item_epi_sem_destino_elegivel_nao_gera_nenhum_debito(): void
    {
        $this->actingAs($this->operador)->postJson('/api/saidas', $this->payloadSaida(1))->assertStatus(201);

        $this->assertSame(0, \App\Models\DebitoManutencao::count(), 'Sem destino Frota/Manutenção, nem o registro informativo de EPI deve ser criado.');
    }
}
