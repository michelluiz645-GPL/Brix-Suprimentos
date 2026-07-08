<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * RF-025 — Débitos de Manutenção.
     */
    public function up(): void
    {
        Schema::create('debitos_manutencao', function (Blueprint $table) {
            $table->id();
            $table->string('numero')->nullable();
            $table->string('pedido_origem')->nullable();
            $table->date('data');
            $table->string('equipe');
            $table->string('nome_equipe')->nullable();
            $table->string('colaborador')->nullable();
            $table->string('almoxarifado')->nullable();
            $table->json('itens');
            $table->decimal('total', 12, 2)->default(0);
            $table->enum('status', ['ABERTO', 'PAGO'])->default('ABERTO');
            $table->string('registrado_por');
            $table->date('data_pagamento')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('debitos_manutencao');
    }
};
