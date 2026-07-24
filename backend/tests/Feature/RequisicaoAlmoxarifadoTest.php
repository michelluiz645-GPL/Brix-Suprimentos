<?php

namespace Tests\Feature;

use App\Models\DebitoManutencao;
use App\Models\Equipe;
use App\Models\Modulo;
use App\Models\Movimento;
use App\Models\Obra;
use App\Models\Produto;
use App\Models\ProdutoVariacao;
use App\Models\RequisicaoAlmoxarifado;
use App\Models\Setor;
use App\Models\User;
use Database\Seeders\ModuloSeeder;
use Database\Seeders\SetorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RequisicaoAlmoxarifadoTest extends TestCase
{
    use RefreshDatabase;

    private User $engenheiro;
    private User $almoxarife;
    private Produto $produtoEpi;
    private ProdutoVariacao $variacaoEpi;
    private Produto $produtoPeca;
    private ProdutoVariacao $variacaoPecaA;
    private Produto $produtoConsumivel;
    private ProdutoVariacao $variacaoConsA;
    private ProdutoVariacao $variacaoConsB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SetorSeeder::class);
        $this->seed(ModuloSeeder::class);

        $setorEng = Setor::where('codigo', Setor::ENGENHARIA)->firstOrFail();
        $setorAlm = Setor::where('codigo', Setor::ALMOXARIFADO)->firstOrFail();
        $modulo   = Modulo::where('chave', 'requisicao_almoxarifado')->firstOrFail();

        $this->engenheiro = User::create([
            'nome' => 'Eng Teste', 'login' => 'eng.req', 'email' => 'eng.req@teste.com',
            'password' => bcrypt('123456'), 'nivel' => 'OPERADOR', 'setor_id' => $setorEng->id, 'ativo' => true,
            'papel' => 'op_engenharia',
        ]);
        $this->engenheiro->modulos()->attach($modulo->id, ['responsabilidades' => ['solicitante']]);

        $this->almoxarife = User::create([
            'nome' => 'Almoxarife Teste', 'login' => 'almox.req', 'email' => 'almox.req@teste.com',
            'password' => bcrypt('123456'), 'nivel' => 'OPERADOR', 'setor_id' => $setorAlm->id, 'ativo' => true,
            'papel' => 'almoxarife',
        ]);
        $this->almoxarife->modulos()->attach($modulo->id, ['responsabilidades' => ['aprovador']]);

        $this->produtoEpi = Produto::create([
            'codigo_produto' => 'LUV-REQ', 'nome' => 'Luva de Proteção', 'categoria' => 'EPI', 'unid' => 'UNID',
            'dias_validade_epi' => 90,
        ]);
        $this->variacaoEpi = $this->produtoEpi->variacoes()->create(['marca' => '3M', 'preco' => 10, 'estoque' => 20]);

        $this->produtoPeca = Produto::create([
            'codigo_produto' => 'PEC-REQ', 'nome' => 'Rolamento', 'categoria' => 'Rolamentos', 'unid' => 'UNID',
            'marca_obrigatoria' => true,
        ]);
        $this->variacaoPecaA = $this->produtoPeca->variacoes()->create(['marca' => 'SKF', 'preco' => 50, 'estoque' => 10]);
        $this->produtoPeca->variacoes()->create(['marca' => 'NSK', 'preco' => 45, 'estoque' => 10]);

        $this->produtoConsumivel = Produto::create([
            'codigo_produto' => 'CONS-REQ', 'nome' => 'Fluido de Freio', 'categoria' => 'Consumo Adm', 'unid' => 'LT',
        ]);
        $this->variacaoConsA = $this->produtoConsumivel->variacoes()->create(['marca' => 'Bosch', 'preco' => 20, 'estoque' => 8]);
        $this->variacaoConsB = $this->produtoConsumivel->variacoes()->create(['marca' => 'ATE', 'preco' => 22, 'estoque' => 4]);
    }

    private function payloadBase(array $itens): array
    {
        return [
            'data' => '2026-07-19', 'data_desejada' => '2026-07-25', 'urgencia' => 'Média', 'justificativa' => 'Teste',
            'itens' => $itens,
        ];
    }

    public function test_criacao_exige_colaborador_para_item_epi(): void
    {
        $payload = $this->payloadBase([
            ['produto_id' => $this->produtoEpi->id, 'quantidade' => 2, 'destino' => 'Para a Equipe', 'destino_equipe' => 'Equipe 01'],
        ]);

        $this->actingAs($this->engenheiro)
            ->postJson('/api/requisicoes-almoxarifado', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['itens.0.colaborador_epi']);
    }

    public function test_criacao_exige_equipe_quando_destino_e_para_a_equipe(): void
    {
        $payload = $this->payloadBase([
            ['produto_id' => $this->produtoConsumivel->id, 'quantidade' => 1, 'destino' => 'Para a Equipe'],
        ]);

        $this->actingAs($this->engenheiro)
            ->postJson('/api/requisicoes-almoxarifado', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['itens.0.destino_equipe']);

        $payload['itens'][0]['destino_equipe'] = 'Equipe 01';

        $this->actingAs($this->engenheiro)
            ->postJson('/api/requisicoes-almoxarifado', $payload)
            ->assertStatus(201)
            ->assertJsonPath('data.itens.0.destino_equipe', 'Equipe 01');
    }

    public function test_centro_de_custo_vem_da_equipe_ou_da_obra_do_item(): void
    {
        Equipe::create(['nome' => 'Equipe Norte', 'numero' => 'Equipe 01', 'centro_custo' => 'CC-EQ-01', 'tipo' => 'Outro']);
        Obra::create(['nome' => 'Obra Teste', 'endereco' => 'Rua X', 'centro_custo' => 'CC-OBRA-01', 'status' => 'ATIVA']);

        $payload = $this->payloadBase([
            ['produto_id' => $this->produtoConsumivel->id, 'quantidade' => 1, 'destino' => 'Para a Equipe', 'destino_equipe' => 'Equipe 01'],
            ['produto_id' => $this->produtoConsumivel->id, 'quantidade' => 1, 'destino' => 'Obra', 'destino_obra' => 'Obra Teste'],
        ]);

        $resposta = $this->actingAs($this->engenheiro)
            ->postJson('/api/requisicoes-almoxarifado', $payload)
            ->assertStatus(201);

        $resposta->assertJsonPath('data.itens.0.centro_custo', 'CC-EQ-01');
        $resposta->assertJsonPath('data.itens.1.centro_custo', 'CC-OBRA-01');
    }

    public function test_criacao_exige_data_desejada(): void
    {
        $payload = $this->payloadBase([
            ['produto_id' => $this->produtoConsumivel->id, 'quantidade' => 1, 'destino' => 'Outros'],
        ]);
        unset($payload['data_desejada']);

        $this->actingAs($this->engenheiro)
            ->postJson('/api/requisicoes-almoxarifado', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['data_desejada']);

        $payload['data_desejada'] = '2026-07-25';

        $this->actingAs($this->engenheiro)
            ->postJson('/api/requisicoes-almoxarifado', $payload)
            ->assertStatus(201)
            ->assertJsonPath('data.data_desejada', '2026-07-25');
    }

    public function test_criacao_exige_variacao_quando_marca_obrigatoria(): void
    {
        $payload = $this->payloadBase([
            ['produto_id' => $this->produtoPeca->id, 'quantidade' => 2, 'destino' => 'Manutenção'],
        ]);

        $this->actingAs($this->engenheiro)
            ->postJson('/api/requisicoes-almoxarifado', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['itens.0.produto_variacao_id']);

        $payload['itens'][0]['produto_variacao_id'] = $this->variacaoPecaA->id;

        $this->actingAs($this->engenheiro)
            ->postJson('/api/requisicoes-almoxarifado', $payload)
            ->assertStatus(201);
    }

    public function test_aprovar_reduz_disponivel_sem_tocar_estoque_fisico(): void
    {
        $payload = $this->payloadBase([
            ['produto_id' => $this->produtoConsumivel->id, 'quantidade' => 5, 'destino' => 'Obra', 'destino_obra' => 'Obra Teste'],
        ]);
        $id = $this->actingAs($this->engenheiro)->postJson('/api/requisicoes-almoxarifado', $payload)->json('data.id');

        $this->actingAs($this->almoxarife)->postJson("/api/requisicoes-almoxarifado/{$id}/aprovar")->assertStatus(200);

        $this->variacaoConsA->refresh();
        $this->variacaoConsB->refresh();
        $this->assertEquals(8, $this->variacaoConsA->estoque, 'Aprovação não deve tocar o estoque físico.');
        $this->assertEquals(4, $this->variacaoConsB->estoque);

        $produtos = $this->actingAs($this->almoxarife)
            ->getJson('/api/requisicoes-almoxarifado/produtos-disponiveis')->json('data');
        $consumivel = collect($produtos)->firstWhere('id', $this->produtoConsumivel->id);
        $this->assertEquals(12, $consumivel['estoque_total']);
        $this->assertEquals(5, $consumivel['reservado']);
        $this->assertEquals(7, $consumivel['disponivel']);
    }

    public function test_confirmar_separacao_decrementa_estoque_gera_movimento_epi_e_debito(): void
    {
        $payload = $this->payloadBase([
            ['produto_id' => $this->produtoEpi->id, 'quantidade' => 2, 'destino' => 'Frota', 'destino_frota' => 'ABC-1234', 'colaborador_epi' => 'Carlos Souza'],
        ]);
        $id = $this->actingAs($this->engenheiro)->postJson('/api/requisicoes-almoxarifado', $payload)->json('data.id');
        $this->actingAs($this->almoxarife)->postJson("/api/requisicoes-almoxarifado/{$id}/aprovar")->assertStatus(200);
        $itemId = RequisicaoAlmoxarifado::find($id)->itens()->first()->id;

        $this->actingAs($this->almoxarife)
            ->postJson("/api/requisicoes-almoxarifado/{$id}/confirmar-separacao", [
                'almoxarifado' => 'Almox Central', 'resp_almox' => 'Maria', 'entregador' => 'João',
                'itens' => [['item_id' => $itemId, 'acao' => 'separar']],
            ])->assertStatus(200);

        $this->variacaoEpi->refresh();
        $this->assertEquals(18, $this->variacaoEpi->estoque);

        $movimento = Movimento::where('tipo', 'SAÍDA')->firstOrFail();
        $this->assertSame('Retirada', $movimento->tipo_saida);
        $this->assertSame('Carlos Souza', $movimento->colaborador_epi);

        $this->assertDatabaseHas('epi_registros', ['funcionario' => 'Carlos Souza', 'epi' => 'Luva de Proteção - 3M']);

        $this->assertSame(0, DebitoManutencao::where('natureza', 'MATERIAL')->count());
        $this->assertSame(1, DebitoManutencao::where('natureza', 'EPI')->count());

        $requisicao = RequisicaoAlmoxarifado::find($id);
        $this->assertSame('CONCLUIDA', $requisicao->status);
        $this->assertSame($movimento->numero_pedido, $requisicao->numero_pedido_saida);
    }

    public function test_confirmar_separacao_com_marca_livre_exige_escolha_da_marca(): void
    {
        $payload = $this->payloadBase([
            ['produto_id' => $this->produtoConsumivel->id, 'quantidade' => 3, 'destino' => 'Obra', 'destino_obra' => 'Obra Teste'],
        ]);
        $id = $this->actingAs($this->engenheiro)->postJson('/api/requisicoes-almoxarifado', $payload)->json('data.id');
        $this->actingAs($this->almoxarife)->postJson("/api/requisicoes-almoxarifado/{$id}/aprovar");
        $item = RequisicaoAlmoxarifado::find($id)->itens()->first();

        $this->actingAs($this->almoxarife)
            ->postJson("/api/requisicoes-almoxarifado/{$id}/confirmar-separacao", [
                'almoxarifado' => 'Almox Central', 'resp_almox' => 'Maria', 'entregador' => 'João',
                'itens' => [['item_id' => $item->id, 'acao' => 'separar']],
            ])->assertStatus(422);

        $this->actingAs($this->almoxarife)
            ->postJson("/api/requisicoes-almoxarifado/{$id}/confirmar-separacao", [
                'almoxarifado' => 'Almox Central', 'resp_almox' => 'Maria', 'entregador' => 'João',
                'itens' => [['item_id' => $item->id, 'acao' => 'separar', 'produto_variacao_id' => $this->variacaoConsA->id]],
            ])->assertStatus(200);

        $this->variacaoConsA->refresh();
        $this->assertEquals(5, $this->variacaoConsA->estoque);
    }

    public function test_separacao_parcial_deixa_requisicao_aprovada_ate_resolver_todos_os_itens(): void
    {
        $payload = $this->payloadBase([
            ['produto_id' => $this->produtoEpi->id, 'quantidade' => 1, 'destino' => 'Outros', 'colaborador_epi' => 'Carlos Souza'],
            ['produto_id' => $this->produtoPeca->id, 'quantidade' => 1, 'destino' => 'Outros', 'produto_variacao_id' => $this->variacaoPecaA->id],
        ]);
        $id = $this->actingAs($this->engenheiro)->postJson('/api/requisicoes-almoxarifado', $payload)->json('data.id');
        $this->actingAs($this->almoxarife)->postJson("/api/requisicoes-almoxarifado/{$id}/aprovar")->assertStatus(200);

        $itens = RequisicaoAlmoxarifado::find($id)->itens;
        $itemEpi = $itens->firstWhere('produto_id', $this->produtoEpi->id);
        $itemPeca = $itens->firstWhere('produto_id', $this->produtoPeca->id);

        // Só separa o item EPI nessa rodada — o outro fica pendente.
        $this->actingAs($this->almoxarife)
            ->postJson("/api/requisicoes-almoxarifado/{$id}/confirmar-separacao", [
                'almoxarifado' => 'Almox Central', 'resp_almox' => 'Maria', 'entregador' => 'João',
                'itens' => [['item_id' => $itemEpi->id, 'acao' => 'separar']],
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'APROVADA');

        $itemEpi->refresh();
        $itemPeca->refresh();
        $this->assertSame('SEPARADO', $itemEpi->status);
        $this->assertSame('PENDENTE', $itemPeca->status);

        // Segunda rodada: o item da peça acabou não indo ter -> requisição fecha.
        $this->actingAs($this->almoxarife)
            ->postJson("/api/requisicoes-almoxarifado/{$id}/confirmar-separacao", [
                'almoxarifado' => 'Almox Central', 'resp_almox' => 'Maria', 'entregador' => 'João',
                'itens' => [['item_id' => $itemPeca->id, 'acao' => 'indisponivel']],
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'CONCLUIDA');

        $itemPeca->refresh();
        $this->assertSame('INDISPONIVEL', $itemPeca->status);

        // Item indisponível não decrementou estoque nenhum.
        $this->variacaoPecaA->refresh();
        $this->assertEquals(10, $this->variacaoPecaA->estoque);
    }

    public function test_item_indisponivel_nao_conta_mais_como_reservado(): void
    {
        $payload = $this->payloadBase([
            ['produto_id' => $this->produtoConsumivel->id, 'quantidade' => 5, 'destino' => 'Outros'],
        ]);
        $id = $this->actingAs($this->engenheiro)->postJson('/api/requisicoes-almoxarifado', $payload)->json('data.id');
        $this->actingAs($this->almoxarife)->postJson("/api/requisicoes-almoxarifado/{$id}/aprovar");
        $item = RequisicaoAlmoxarifado::find($id)->itens()->first();

        $this->actingAs($this->almoxarife)
            ->postJson("/api/requisicoes-almoxarifado/{$id}/confirmar-separacao", [
                'almoxarifado' => 'Almox Central', 'resp_almox' => 'Maria', 'entregador' => 'João',
                'itens' => [['item_id' => $item->id, 'acao' => 'indisponivel']],
            ])->assertStatus(200);

        $produtos = $this->actingAs($this->almoxarife)
            ->getJson('/api/requisicoes-almoxarifado/produtos-disponiveis')->json('data');
        $consumivel = collect($produtos)->firstWhere('id', $this->produtoConsumivel->id);
        $this->assertEquals(0, $consumivel['reservado']);
        $this->assertEquals(12, $consumivel['disponivel']);
    }

    public function test_engenharia_nao_pode_aprovar_rejeitar_ou_cancelar(): void
    {
        $payload = $this->payloadBase([
            ['produto_id' => $this->produtoConsumivel->id, 'quantidade' => 1, 'destino' => 'Outros'],
        ]);
        $id = $this->actingAs($this->engenheiro)->postJson('/api/requisicoes-almoxarifado', $payload)->json('data.id');

        $this->actingAs($this->engenheiro)->postJson("/api/requisicoes-almoxarifado/{$id}/aprovar")->assertStatus(403);
        $this->actingAs($this->engenheiro)->postJson("/api/requisicoes-almoxarifado/{$id}/rejeitar", ['motivo' => 'Não autorizado'])->assertStatus(403);
        $this->actingAs($this->engenheiro)->postJson("/api/requisicoes-almoxarifado/{$id}/cancelar", ['motivo' => 'Não autorizado'])->assertStatus(403);
    }

    public function test_cancelar_funciona_pendente_e_aprovada(): void
    {
        $payload = $this->payloadBase([
            ['produto_id' => $this->produtoConsumivel->id, 'quantidade' => 1, 'destino' => 'Outros'],
        ]);

        $id1 = $this->actingAs($this->engenheiro)->postJson('/api/requisicoes-almoxarifado', $payload)->json('data.id');
        $this->actingAs($this->almoxarife)
            ->postJson("/api/requisicoes-almoxarifado/{$id1}/cancelar", ['motivo' => 'Não precisa mais'])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'CANCELADA');

        $id2 = $this->actingAs($this->engenheiro)->postJson('/api/requisicoes-almoxarifado', $payload)->json('data.id');
        $this->actingAs($this->almoxarife)->postJson("/api/requisicoes-almoxarifado/{$id2}/aprovar");
        $this->actingAs($this->almoxarife)
            ->postJson("/api/requisicoes-almoxarifado/{$id2}/cancelar", ['motivo' => 'Item já foi comprado por outro meio'])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'CANCELADA');
    }

    /**
     * "Enviar" (solicitante) e "receber" (aprovador) são responsabilidades
     * independentes, configuráveis por usuário — não amarradas a papel/setor.
     */
    public function test_enviar_e_receber_sao_configuraveis_por_usuario_independente_do_papel(): void
    {
        $setorAlm = Setor::where('codigo', Setor::ALMOXARIFADO)->firstOrFail();
        $modulo   = Modulo::where('chave', 'requisicao_almoxarifado')->firstOrFail();

        // Almoxarife sem nenhuma responsabilidade marcada: não deve nem
        // aprovar, nem criar.
        $almoxarifeSemNada = User::create([
            'nome' => 'Almoxarife Sem Nada', 'login' => 'almox.semnada', 'email' => 'almox.semnada@teste.com',
            'password' => bcrypt('123456'), 'nivel' => 'OPERADOR', 'setor_id' => $setorAlm->id, 'ativo' => true,
            'papel' => 'almoxarife',
        ]);

        $payload = $this->payloadBase([
            ['produto_id' => $this->produtoConsumivel->id, 'quantidade' => 1, 'destino' => 'Outros'],
        ]);

        $this->actingAs($almoxarifeSemNada)->postJson('/api/requisicoes-almoxarifado', $payload)->assertStatus(403);

        $id = $this->actingAs($this->engenheiro)->postJson('/api/requisicoes-almoxarifado', $payload)->json('data.id');
        $this->actingAs($almoxarifeSemNada)->postJson("/api/requisicoes-almoxarifado/{$id}/aprovar")->assertStatus(403);

        // Almoxarife com as duas responsabilidades marcadas (enviar + receber)
        // pode fazer as duas coisas.
        $almoxarifeComTudo = User::create([
            'nome' => 'Almoxarife Com Tudo', 'login' => 'almox.comtudo', 'email' => 'almox.comtudo@teste.com',
            'password' => bcrypt('123456'), 'nivel' => 'OPERADOR', 'setor_id' => $setorAlm->id, 'ativo' => true,
            'papel' => 'almoxarife',
        ]);
        $almoxarifeComTudo->modulos()->attach($modulo->id, ['responsabilidades' => ['solicitante', 'aprovador']]);

        $this->actingAs($almoxarifeComTudo)->postJson('/api/requisicoes-almoxarifado', $payload)->assertStatus(201);
        $this->actingAs($almoxarifeComTudo)->postJson("/api/requisicoes-almoxarifado/{$id}/aprovar")->assertStatus(200);
    }
}
