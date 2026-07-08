<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * RF-022 — Pedido de Compra.
     */
    public function up(): void
    {
        Schema::create('pedidos_compra', function (Blueprint $table) {
            $table->id();
            $table->string('num_pc')->unique();
            $table->date('data_pedido');
            $table->string('solicitante');
            $table->string('setor_origem');
            $table->string('obra')->nullable();
            $table->string('centro_custo')->nullable();
            $table->string('num_sc_ref')->nullable();
            $table->string('forn_nome')->nullable();
            $table->string('forn_cnpj')->nullable();
            $table->string('forn_tel')->nullable();
            $table->string('forn_contato')->nullable();
            $table->string('forn_email')->nullable();
            $table->string('local_entrega')->nullable();
            $table->date('data_desejada')->nullable();
            $table->string('cond_pagamento')->nullable();
            $table->decimal('frete', 12, 2)->default(0);
            $table->decimal('outras_despesas', 12, 2)->default(0);
            $table->decimal('desconto_total', 12, 2)->default(0);
            $table->json('itens');
            $table->enum('status', ['PENDENTE', 'APROVADO', 'CONCLUÍDO', 'CANCELADO'])->default('PENDENTE');
            // RF-029: pedido gerado pela Reposição Automática entra aqui marcado como "Automático"
            $table->enum('origem', ['MANUAL', 'AUTOMATICO'])->default('MANUAL');
            $table->string('urgencia')->nullable();
            $table->foreignId('criado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pedidos_compra');
    }
};
