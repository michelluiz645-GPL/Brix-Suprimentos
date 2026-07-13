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

    private function criarUsuario(string $papel, string $codigoSetor, array $responsabilidades): User
    {
        static $seq = 0;
        $seq++;

        $setor  = Setor::where('codigo', $codigoSetor)->firstOrFail();
        $modulo = Modulo::where('chave', 'pedido_orcamento')->firstOrFail();

        $user = User::create([
            'nome' => "Usuário {$papel} {$seq}", 'login' => "{$papel}.{$seq}", 'email' => "{$papel}{$seq}@teste.com",
            'password' => bcrypt('123456'), 'nivel' => 'OPERADOR', 'setor_id' => $setor->id, 'ativo' => true,
            'papel' => $papel,
        ]);
        $user->modulos()->attach($modulo->id, ['responsabilidades' => $responsabilidades]);

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
}
