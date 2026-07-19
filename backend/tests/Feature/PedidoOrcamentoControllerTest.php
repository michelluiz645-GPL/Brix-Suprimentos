<?php

namespace Tests\Feature;

use App\Models\Modulo;
use App\Models\PedidoOrcamento;
use App\Models\Setor;
use App\Models\User;
use Database\Seeders\ModuloSeeder;
use Database\Seeders\SetorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * RF-029 — Reposição Automática cria um Pedido de Orçamento com
 * setor=ALMOXARIFADO, que não passa pela aprovação da Manutenção: quem
 * aprova o orçamento nesse caso é o próprio aprovador de Suprimentos.
 */
class PedidoOrcamentoControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SetorSeeder::class);
        $this->seed(ModuloSeeder::class);
        $setor = Setor::where('codigo', Setor::ALMOXARIFADO)->firstOrFail();
        $this->admin = User::create([
            'nome' => 'Admin', 'login' => 'admin.teste', 'email' => 'admin.teste@teste.com',
            'password' => bcrypt('123456'), 'nivel' => 'ADMIN', 'setor_id' => $setor->id, 'ativo' => true,
            'papel' => 'admin_geral',
        ]);
    }

    private function criarUsuario(string $papel, string $codigoSetor, array $responsabilidades, string $nivel = 'OPERADOR', array $setoresAtendidos = []): User
    {
        static $seq = 0;
        $seq++;

        $setor  = Setor::where('codigo', $codigoSetor)->firstOrFail();
        $modulo = Modulo::where('chave', 'pedido_orcamento')->firstOrFail();

        $user = User::create([
            'nome' => "Usuário {$papel} {$seq}", 'login' => "{$papel}.{$seq}", 'email' => "{$papel}{$seq}@teste.com",
            'password' => bcrypt('123456'), 'nivel' => $nivel, 'setor_id' => $setor->id, 'ativo' => true,
            'papel' => $papel,
        ]);
        $user->modulos()->attach($modulo->id, ['responsabilidades' => $responsabilidades, 'setores_atendidos' => $setoresAtendidos]);

        return $user;
    }

    private function criarPedidoAlmoxarifadoECotar(User $cotador): PedidoOrcamento
    {
        $pedido = $this->actingAs($this->admin)->postJson('/api/pedidos-orcamento', [
            'data' => '2026-07-09', 'data_desejada' => '2026-07-15', 'setor' => 'ALMOXARIFADO',
            'destino' => 'Reposição de estoque — Filtro', 'tipo_destino' => 'ESTOQUE', 'urgencia' => 'CRITICA',
            'itens' => [['descricao' => 'Filtro de Óleo', 'quantidade' => 10, 'unidade' => 'UNID']],
        ])->json('data');
        $pedido = PedidoOrcamento::findOrFail($pedido['id']);

        $this->actingAs($cotador)->postJson("/api/pedidos-orcamento/{$pedido->id}/iniciar-cotacao");
        $this->actingAs($cotador)->postJson("/api/pedidos-orcamento/{$pedido->id}/enviar-aprovacao-manutencao", [
            'fornecedores' => [['nome' => 'A'], ['nome' => 'B'], ['nome' => 'C']],
            'itens' => [['descricao' => 'Filtro de Óleo', 'quantidade' => 10, 'unidade' => 'UNID', 'fornecedores' => [
                ['preco' => 15], ['preco' => 18], ['preco' => 20],
            ]]],
        ]);

        return $pedido->fresh();
    }

    public function test_pedido_do_almoxarifado_nao_pode_ser_aprovado_por_aprovador_de_manutencao(): void
    {
        $cotador = $this->criarUsuario('op_suprimentos', Setor::ALMOXARIFADO, ['cotador']);
        $aprovadorManutencao = $this->criarUsuario('admin_manutencao', Setor::MANUTENCAO, ['aprovador_manutencao']);
        $pedido = $this->criarPedidoAlmoxarifadoECotar($cotador);

        $this->actingAs($aprovadorManutencao)
            ->postJson("/api/pedidos-orcamento/{$pedido->id}/aprovar-manutencao", ['escolhas' => [['fornecedor_indice' => 0]]])
            ->assertStatus(403);
    }

    public function test_pedido_do_almoxarifado_e_aprovado_direto_pelo_aprovador_de_suprimentos(): void
    {
        $cotador = $this->criarUsuario('op_suprimentos', Setor::ALMOXARIFADO, ['cotador']);
        $aprovadorSuprimentos = $this->criarUsuario('admin_suprimentos', Setor::ALMOXARIFADO, ['aprovador_suprimentos']);
        $pedido = $this->criarPedidoAlmoxarifadoECotar($cotador);

        $this->actingAs($aprovadorSuprimentos)
            ->postJson("/api/pedidos-orcamento/{$pedido->id}/aprovar-manutencao", ['escolhas' => [['fornecedor_indice' => 0]]])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'AGUARDANDO_APROVACAO_COMPRA');
    }

    public function test_nao_permite_novo_pedido_de_reposicao_para_produto_com_pedido_em_aberto(): void
    {
        $payload = [
            'data' => '2026-07-13', 'data_desejada' => '2026-07-20', 'setor' => 'ALMOXARIFADO', 'destino' => 'Reposição de estoque — Filtro',
            'tipo_destino' => 'ESTOQUE', 'urgencia' => 'CRITICA',
            'itens' => [['descricao' => 'Filtro de Óleo', 'quantidade' => 10, 'unidade' => 'UNID', 'codigo_produto' => '902']],
        ];

        $this->actingAs($this->admin)->postJson('/api/pedidos-orcamento', $payload)->assertStatus(201);

        $this->actingAs($this->admin)->postJson('/api/pedidos-orcamento', $payload)
            ->assertStatus(422)
            ->assertJsonFragment(['message' => 'Já existe um pedido em aberto (SC-ORC-2026-0001) para o produto "902".']);
    }

    public function test_permite_novo_pedido_apos_o_anterior_ser_rejeitado(): void
    {
        $payload = [
            'data' => '2026-07-13', 'data_desejada' => '2026-07-20', 'setor' => 'ALMOXARIFADO', 'destino' => 'Reposição de estoque — Filtro',
            'tipo_destino' => 'ESTOQUE', 'urgencia' => 'CRITICA',
            'itens' => [['descricao' => 'Filtro de Óleo', 'quantidade' => 10, 'unidade' => 'UNID', 'codigo_produto' => '902']],
        ];

        $pedido = $this->actingAs($this->admin)->postJson('/api/pedidos-orcamento', $payload)->json('data');
        PedidoOrcamento::findOrFail($pedido['id'])->update(['status' => 'REJEITADO']);

        $this->actingAs($this->admin)->postJson('/api/pedidos-orcamento', $payload)->assertStatus(201);
    }

    private function criarPedidoEngenhariaECotar(User $cotador): PedidoOrcamento
    {
        $pedido = $this->actingAs($this->admin)->postJson('/api/pedidos-orcamento', [
            'data' => '2026-07-15', 'data_desejada' => '2026-07-20', 'setor' => 'ENGENHARIA',
            'destino' => 'Obra Rodovia BR-153', 'tipo_destino' => 'OBRA', 'urgencia' => 'ALTA',
            'itens' => [['descricao' => 'Cimento CP-II', 'quantidade' => 50, 'unidade' => 'Saco']],
        ])->assertStatus(201)->json('data');
        $pedido = PedidoOrcamento::findOrFail($pedido['id']);

        $this->actingAs($cotador)->postJson("/api/pedidos-orcamento/{$pedido->id}/iniciar-cotacao");
        $this->actingAs($cotador)->postJson("/api/pedidos-orcamento/{$pedido->id}/enviar-aprovacao-manutencao", [
            'fornecedores' => [['nome' => 'A'], ['nome' => 'B'], ['nome' => 'C']],
            'itens' => [['descricao' => 'Cimento CP-II', 'quantidade' => 50, 'unidade' => 'Saco', 'fornecedores' => [
                ['preco' => 30], ['preco' => 32], ['preco' => 35],
            ]]],
        ]);

        return $pedido->fresh();
    }

    public function test_pedido_da_engenharia_nao_pode_ser_aprovado_por_aprovador_de_manutencao(): void
    {
        $cotador = $this->criarUsuario('op_suprimentos', Setor::ALMOXARIFADO, ['cotador']);
        $aprovadorManutencao = $this->criarUsuario('admin_manutencao', Setor::MANUTENCAO, ['aprovador_manutencao']);
        $pedido = $this->criarPedidoEngenhariaECotar($cotador);

        $this->actingAs($aprovadorManutencao)
            ->postJson("/api/pedidos-orcamento/{$pedido->id}/aprovar-manutencao", ['escolhas' => [['fornecedor_indice' => 0]]])
            ->assertStatus(403);
    }

    public function test_aprovador_de_suprimentos_nao_aprova_pedido_da_engenharia(): void
    {
        $cotador = $this->criarUsuario('op_suprimentos', Setor::ALMOXARIFADO, ['cotador']);
        $aprovadorSuprimentos = $this->criarUsuario('admin_suprimentos', Setor::ALMOXARIFADO, ['aprovador_suprimentos']);
        $pedido = $this->criarPedidoEngenhariaECotar($cotador);

        $this->actingAs($aprovadorSuprimentos)
            ->postJson("/api/pedidos-orcamento/{$pedido->id}/aprovar-manutencao", ['escolhas' => [['fornecedor_indice' => 0]]])
            ->assertStatus(403);
    }

    public function test_pedido_da_engenharia_e_aprovado_direto_pelo_aprovador_de_engenharia(): void
    {
        $cotador = $this->criarUsuario('op_suprimentos', Setor::ALMOXARIFADO, ['cotador']);
        $aprovadorEngenharia = $this->criarUsuario('admin_engenharia', Setor::ENGENHARIA, ['aprovador_engenharia']);
        $pedido = $this->criarPedidoEngenhariaECotar($cotador);

        $this->actingAs($aprovadorEngenharia)
            ->postJson("/api/pedidos-orcamento/{$pedido->id}/aprovar-manutencao", ['escolhas' => [['fornecedor_indice' => 0]]])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'AGUARDANDO_APROVACAO_COMPRA');
    }

    public function test_admin_de_setor_nao_acumula_responsabilidade_de_outro_setor(): void
    {
        // Admin da Engenharia (nivel ADMIN, papel admin_engenharia — não admin_geral)
        // não deve virar "cotador" nem "aprovador_suprimentos" só por ser Admin.
        $adminEngenharia = $this->criarUsuario('admin_engenharia', Setor::ENGENHARIA, [], 'ADMIN');

        $this->assertFalse($adminEngenharia->temResponsabilidade('pedido_orcamento', 'cotador'));
        $this->assertFalse($adminEngenharia->temResponsabilidade('pedido_orcamento', 'aprovador_suprimentos'));
        $this->assertFalse($adminEngenharia->temResponsabilidade('pedido_orcamento', 'aprovador_manutencao'));
        $this->assertTrue($adminEngenharia->temResponsabilidade('pedido_orcamento', 'aprovador_engenharia'));
        $this->assertTrue($adminEngenharia->temResponsabilidade('pedido_orcamento', 'solicitante'));
    }

    public function test_admin_geral_continua_acumulando_tudo(): void
    {
        $this->assertTrue($this->admin->temResponsabilidade('pedido_orcamento', 'cotador'));
        $this->assertTrue($this->admin->temResponsabilidade('pedido_orcamento', 'aprovador_engenharia'));
        $this->assertTrue($this->admin->temResponsabilidade('pedido_orcamento', 'aprovador_manutencao'));
    }

    public function test_cotador_configurado_so_pra_manutencao_nao_cota_pedido_da_engenharia(): void
    {
        $cotadorSoManutencao = $this->criarUsuario('op_suprimentos', Setor::ALMOXARIFADO, ['cotador'], 'OPERADOR', [Setor::MANUTENCAO]);
        $aprovadorEngenharia = $this->criarUsuario('admin_engenharia', Setor::ENGENHARIA, ['aprovador_engenharia']);

        $pedido = $this->actingAs($this->admin)->postJson('/api/pedidos-orcamento', [
            'data' => '2026-07-16', 'data_desejada' => '2026-07-25', 'setor' => 'ENGENHARIA', 'destino' => 'Obra Teste',
            'tipo_destino' => 'OBRA', 'urgencia' => 'ALTA',
            'itens' => [['descricao' => 'Cimento', 'quantidade' => 10, 'unidade' => 'Saco']],
        ])->json('data');

        $this->actingAs($cotadorSoManutencao)
            ->postJson("/api/pedidos-orcamento/{$pedido['id']}/iniciar-cotacao")
            ->assertStatus(403);

        // O mesmo cotador continua liberado pra pedidos de Manutenção, sem quebrar nada.
        $pedidoManutencao = PedidoOrcamento::create([
            'numero_sc' => 'SC-ORC-TESTE-0001', 'data' => '2026-07-16', 'setor' => 'MANUTENCAO',
            'solicitante_id' => $aprovadorEngenharia->id, 'destino' => 'PC200', 'tipo_destino' => 'FROTA',
            'urgencia' => 'ALTA', 'itens' => [['descricao' => 'Óleo', 'quantidade' => 5, 'unidade' => 'Lt']],
            'valor_total' => 0, 'status' => 'PENDENTE', 'timeline' => [],
        ]);

        $this->actingAs($cotadorSoManutencao)
            ->postJson("/api/pedidos-orcamento/{$pedidoManutencao->id}/iniciar-cotacao")
            ->assertStatus(200);
    }
}
