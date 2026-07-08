<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * RF-010 — Combustíveis.
     */
    public function up(): void
    {
        Schema::create('combustivel_movimentos', function (Blueprint $table) {
            $table->id();
            $table->enum('tipo', ['ENTRADA', 'ABASTECIMENTO']);
            $table->string('combustivel');
            $table->decimal('quantidade', 12, 2);
            $table->decimal('valor_litro', 12, 3)->nullable();
            $table->decimal('valor', 12, 2)->default(0);
            $table->string('fornecedor')->nullable();
            $table->string('frota')->nullable();
            $table->string('responsavel');
            $table->date('data');
            $table->string('usuario')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('combustivel_movimentos');
    }
};
