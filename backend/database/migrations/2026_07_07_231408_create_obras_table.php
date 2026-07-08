<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * RF-017 — Obras & Projetos.
     */
    public function up(): void
    {
        Schema::create('obras', function (Blueprint $table) {
            $table->id();
            $table->string('setor')->default('ENGENHARIA');
            $table->string('nome');
            $table->enum('tipo', ['PUBLICA', 'PRIVADA'])->default('PUBLICA');
            $table->text('descricao')->nullable();
            $table->string('responsavel')->nullable();
            $table->date('data_inicio')->nullable();
            $table->date('data_prev')->nullable();
            $table->string('centro_custo');
            $table->enum('status', ['ATIVA', 'CONCLUÍDA', 'SUSPENSA'])->default('ATIVA');
            $table->foreignId('criado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('obras');
    }
};
