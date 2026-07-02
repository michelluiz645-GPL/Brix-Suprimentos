<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Implementa a RN-002.2: cada usuário tem sua própria lista de módulos
     * liberados, independente do nível (ADMIN/OPERADOR). O template padrão
     * por nível+setor só é usado para PRÉ-POPULAR esta tabela na criação do
     * usuário (RN-027.2) — depois disso, a edição é sempre individual.
     */
    public function up(): void
    {
        Schema::create('user_modulo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('modulo_id')->constrained('modulos')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['user_id', 'modulo_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_modulo');
    }
};
