<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * RF-028 — Catálogo de Materiais de Obra.
     */
    public function up(): void
    {
        Schema::create('materiais_obra', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->string('nome');
            $table->string('categoria');
            $table->string('unidade')->default('UN');
            $table->text('especificacao')->nullable();
            $table->text('obs')->nullable();
            $table->enum('status', ['ATIVO', 'INATIVO'])->default('ATIVO');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('materiais_obra');
    }
};
