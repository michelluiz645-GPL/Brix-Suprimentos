<?php

namespace Tests\Feature;

use App\Models\PedidoOrcamento;
use App\Models\Setor;
use App\Models\User;
use App\Services\PedidoOrcamentoService;
use Database\Seeders\SetorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PedidoOrcamentoServiceTest extends TestCase
{
    use RefreshDatabase;

    private PedidoOrcamentoService $service;
    private User $solicitante;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(SetorSeeder::class);
        $this->service = app(PedidoOrcamentoService::class);

        $setor = Setor::where('codigo', Setor::MANUTENCAO)->firstOrFail();
        $this->solicitante = User::create([
            'nome' => 'Solicitante Teste', 'login' => 'solicitante.teste', 'email' => 'solicitante@teste.com',
            'password' => bcrypt('123456'), 'nivel' => 'OPERADOR', 'setor_id' => $setor->id, 'ativo' => true,
            'papel' => 'op_manutencao',
        ]);
    }

    private function criarPedido(): PedidoOrcamento
    {
        return $this->service->criar([
            'data' => now()->format('Y-m-d'),
            'destino' => 'PC200 - Escavadeira',
            'tipo_destino' => 'FROTA',
            'urgencia' => 'ALTA',
            'itens' => [['descricao' => 'Item Teste', 'quantidade' => 1, 'unidade' => 'Un']],
        ], $this->solicitante);
    }

    /**
     * A geração de número usa Numerador::lockForUpdate()->firstOrCreate() — o
     * mesmo padrão de trava em linha já usado em SolicitacaoCompraService,
     * que evita a corrida de "SELECT COUNT(*) + 1" (onde duas requisições
     * simultâneas leem o mesmo total antes de qualquer uma gravar e acabam
     * gerando o mesmo número). Este teste é uma regressão sequencial: chama
     * a criação várias vezes seguidas e garante que nunca há duas SCs com o
     * mesmo número. Não é um teste de concorrência real (o ambiente de
     * teste usa SQLite em memória, sem conexões paralelas de verdade) — a
     * segurança sob concorrência vem da trava de linha em si, não deste teste.
     */
    public function test_numeracao_sequencial_nunca_colide(): void
    {
        $numeros = [];

        for ($i = 0; $i < 20; $i++) {
            $pedido = $this->criarPedido();
            $numeros[] = $pedido->numero_sc;
        }

        $this->assertCount(20, array_unique($numeros), 'Todos os números gerados devem ser únicos.');
    }

    public function test_aprovacao_com_vencedor_misto_soma_os_precos_escolhidos_por_item(): void
    {
        $pedido = $this->criarPedido();
        $cotador = $this->criarUsuario('op_suprimentos', Setor::ALMOXARIFADO);
        $aprovador = $this->criarUsuario('admin_manutencao', Setor::MANUTENCAO);

        $this->service->iniciarCotacao($pedido, $cotador);

        $this->service->enviarParaAprovacaoManutencao($pedido, [
            'fornecedores' => [
                ['nome' => 'Fox Painéis', 'forma_pagamento' => '30/60/90'],
                ['nome' => 'Eletromac', 'forma_pagamento' => 'à vista'],
                ['nome' => 'Gerar Power', 'forma_pagamento' => '45 dias'],
            ],
            'itens' => [
                ['descricao' => 'Gerador 180kVA', 'quantidade' => 1, 'unidade' => 'Un', 'fornecedores' => [
                    ['preco' => 68500, 'marca' => 'WEG'],
                    ['preco' => 71200, 'marca' => 'Cummins'],
                    ['preco' => 69900, 'marca' => 'Stemac'],
                ]],
                // quantidade 20 aqui verifica que valor_total = preço unitário × quantidade, não só o preço
                ['descricao' => 'Óleo 15w40', 'quantidade' => 20, 'unidade' => 'Lt', 'fornecedores' => [
                    ['preco' => 15, 'marca' => 'Montana'],
                    ['preco' => 12, 'marca' => 'Genérico'],
                    ['preco' => 14, 'marca' => 'Genérico'],
                ]],
            ],
        ], $cotador);

        // Vencedor misto: item 1 (Gerador) vai pro fornecedor mais caro (índice 2,
        // Stemac), item 2 (Óleo) vai pro mais barato (índice 1, R$12/Lt).
        $this->service->aprovarManutencao($pedido, $aprovador, [
            ['fornecedor_indice' => 2, 'justificativa' => 'Disponibilidade de peças na região'],
            ['fornecedor_indice' => 1, 'justificativa' => null],
        ]);

        $pedido->refresh();

        $this->assertSame('AGUARDANDO_APROVACAO_COMPRA', $pedido->status);
        $this->assertEquals(69900 + (12 * 20), (float) $pedido->valor_total);
        $this->assertSame('Gerar Power, Eletromac', $pedido->fornecedor_escolhido);
        $this->assertSame(2, $pedido->cotacao_itens[0]['fornecedor_escolhido_indice']);
        $this->assertSame(1, $pedido->cotacao_itens[1]['fornecedor_escolhido_indice']);
    }

    public function test_aprovacao_exige_justificativa_quando_escolhido_nao_e_o_mais_barato(): void
    {
        $pedido = $this->criarPedido();
        $cotador = $this->criarUsuario('op_suprimentos', Setor::ALMOXARIFADO);
        $aprovador = $this->criarUsuario('admin_manutencao', Setor::MANUTENCAO);

        $this->service->iniciarCotacao($pedido, $cotador);
        $this->service->enviarParaAprovacaoManutencao($pedido, [
            'fornecedores' => [
                ['nome' => 'Fox Painéis', 'forma_pagamento' => '30/60/90'],
                ['nome' => 'Eletromac', 'forma_pagamento' => 'à vista'],
                ['nome' => 'Gerar Power', 'forma_pagamento' => '45 dias'],
            ],
            'itens' => [
                ['descricao' => 'Gerador 180kVA', 'quantidade' => 1, 'unidade' => 'Un', 'fornecedores' => [
                    ['preco' => 68500, 'marca' => 'WEG'],
                    ['preco' => 71200, 'marca' => 'Cummins'],
                    ['preco' => 69900, 'marca' => 'Stemac'],
                ]],
            ],
        ], $cotador);

        $this->expectException(\InvalidArgumentException::class);

        // índice 1 (Eletromac, R$71.200) não é o mais barato (índice 0, R$68.500) e não tem justificativa
        $this->service->aprovarManutencao($pedido, $aprovador, [
            ['fornecedor_indice' => 1, 'justificativa' => null],
        ]);
    }

    private function criarUsuario(string $papel, string $codigoSetor): User
    {
        static $seq = 0;
        $seq++;

        $setor = Setor::where('codigo', $codigoSetor)->firstOrFail();

        return User::create([
            'nome' => "Usuário {$papel} {$seq}", 'login' => "{$papel}.{$seq}", 'email' => "{$papel}{$seq}@teste.com",
            'password' => bcrypt('123456'), 'nivel' => 'OPERADOR', 'setor_id' => $setor->id, 'ativo' => true,
            'papel' => $papel,
        ]);
    }
}
