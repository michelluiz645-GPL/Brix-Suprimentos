<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('itens_sc', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sc_id')->constrained('solicitacoes_compra')->onDelete('cascade');
            $table->text('descricao');
            $table->decimal('quantidade', 8, 2);
            $table->string('unidade', 20);
            $table->string('fabricante')->nullable();
            $table->string('part_number')->nullable();
            $table->string('aplicacao_equipamento')->nullable();
            $table->string('foto_path')->nullable();
            $table->boolean('recebido')->default(false);
            $table->decimal('quantidade_recebida', 8, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('itens_sc');
    }
};
