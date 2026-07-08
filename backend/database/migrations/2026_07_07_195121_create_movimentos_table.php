<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ledger único de movimentações de estoque — usado por RF-005 (Entrada),
     * RF-006 (Saída), RF-008 (Devolução) e ajustes de RF-013 (Inventário).
     * Uma linha por item movimentado (mesmo NF/pedido gera várias linhas,
     * uma por item, todas com o mesmo numero_pedido).
     */
    public function up(): void
    {
        Schema::create('movimentos', function (Blueprint $table) {
            $table->id();
            $table->string('numero_pedido')->nullable();
            $table->enum('tipo', ['ENTRADA', 'SAÍDA', 'DEVOLUÇÃO', 'AJUSTE']);
            $table->string('numero_nf')->nullable();
            // RF-008: devolução referencia o pedido de saída de origem, e cada
            // item pode ser marcado como danificado (não volta pro estoque)
            $table->string('numero_pedido_origem')->nullable();
            $table->boolean('danificado')->default(false);
            $table->string('codigo');
            $table->foreignId('produto_variacao_id')->nullable()->constrained('produto_variacoes')->nullOnDelete();
            $table->string('nome');
            $table->string('unid')->nullable();
            $table->decimal('qtd', 12, 2);
            $table->decimal('preco', 12, 2)->default(0);
            $table->string('fornecedor')->nullable();
            $table->text('obs')->nullable();
            $table->string('almoxarifado');
            $table->string('responsavel')->nullable();
            $table->date('data');
            $table->string('usuario')->nullable();
            // Campos específicos de Saída (RF-006) — nulos em Entrada/Ajuste
            $table->string('equipe')->nullable();
            $table->string('nome_equipe')->nullable();
            $table->string('colaborador')->nullable();
            $table->string('colaborador_epi')->nullable();
            $table->string('destino_frota')->nullable();
            $table->string('destino')->nullable();
            $table->string('tipo_saida')->nullable();
            $table->string('entregador')->nullable();
            $table->date('epi_vencimento')->nullable();
            $table->enum('status', ['ATIVO', 'CANCELADO'])->default('ATIVO');
            // RF-009: confirmação de recebimento de saídas tipo "Entrega"
            $table->string('confirmado_por')->nullable();
            $table->date('data_confirmacao')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movimentos');
    }
};
