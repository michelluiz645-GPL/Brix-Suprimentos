<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * RF-024 — Equipamentos Pesados. Histórico de movimentações vem
     * codificado como JSON dentro de "obs" (decisão já tomada no frontend),
     * não há tabela separada para isso.
     */
    public function up(): void
    {
        Schema::create('equipamentos', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->string('tipo');
            $table->string('serie')->nullable();
            $table->string('equipe')->nullable();
            $table->text('obs')->nullable();
            $table->enum('status', ['ATIVO', 'INATIVO'])->default('ATIVO');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipamentos');
    }
};
