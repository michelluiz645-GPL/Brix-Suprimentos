<?php

namespace Tests\Feature;

use App\Models\Setor;
use App\Models\User;
use Database\Seeders\SetorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PedidoCompraTest extends TestCase
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

    public function test_pedido_manual_completo_gera_numero_sequencial(): void
    {
        $pedido = $this->actingAs($this->operador)->postJson('/api/pedidos-compra', [
            'solicitante' => 'Ana', 'setor_origem' => 'Engenharia', 'forn_nome' => 'Ferragens Brix',
            'obra' => 'Obra X', 'local_entrega' => 'Rua A', 'data_desejada' => '2026-07-20', 'cond_pagamento' => '30 dias',
            'itens' => [['nome' => 'Cimento', 'qtd' => 50, 'unidade' => 'SC', 'preco_unit' => 30, 'desconto' => 0]],
        ])->assertStatus(201)->json('data');

        $this->assertSame('PC-2026-0001', $pedido['num_pc']);
        $this->assertSame('MANUAL', $pedido['origem']);
    }

    public function test_pedido_automatico_com_campos_minimos(): void
    {
        $pedido = $this->actingAs($this->operador)->postJson('/api/pedidos-compra', [
            'data_pedido' => '2026-07-07', 'data_desejada' => '2026-07-15', 'origem' => 'AUTOMATICO', 'urgencia' => 'Normal',
            'setor_origem' => 'ALMOXARIFADO', 'solicitante' => 'Almoxarifado (reposição automática)',
            'itens' => [['nome' => 'Filtro de Óleo', 'qtd' => 10, 'unidade' => 'UNID', 'preco_unit' => 15, 'desconto' => 0]],
        ])->assertStatus(201)->json('data');

        $this->assertSame('AUTOMATICO', $pedido['origem']);
        $this->assertSame('PENDENTE', $pedido['status']);
    }

    public function test_apenas_admin_aprova_ou_cancela(): void
    {
        $id = $this->actingAs($this->operador)->postJson('/api/pedidos-compra', [
            'solicitante' => 'Ana', 'setor_origem' => 'Engenharia',
            'itens' => [['nome' => 'Cimento', 'qtd' => 1, 'unidade' => 'SC']],
        ])->json('data.id');

        $this->actingAs($this->operador)
            ->patchJson("/api/pedidos-compra/{$id}/status", ['status' => 'APROVADO'])
            ->assertStatus(403);

        $this->actingAs($this->admin)
            ->patchJson("/api/pedidos-compra/{$id}/status", ['status' => 'APROVADO'])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'APROVADO');
    }
}
