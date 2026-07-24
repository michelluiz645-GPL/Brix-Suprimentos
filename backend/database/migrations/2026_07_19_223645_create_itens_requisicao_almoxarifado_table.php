<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('itens_requisicao_almoxarifado', function (Blueprint $table) {
            $table->id();
            $table->foreignId('requisicao_id')->constrained('requisicoes_almoxarifado')->cascadeOnDelete();
            $table->foreignId('produto_id')->constrained('produtos');
            $table->foreignId('produto_variacao_id')->nullable()->constrained('produto_variacoes')->nullOnDelete();
            $table->decimal('quantidade', 12, 2);
            $table->string('destino');
            $table->string('destino_frota')->nullable();
            $table->string('destino_obra')->nullable();
            $table->string('colaborador_epi')->nullable();
            $table->text('observacao')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('itens_requisicao_almoxarifado');
    }
};
