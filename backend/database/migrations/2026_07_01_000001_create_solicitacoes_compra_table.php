<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solicitacoes_compra', function (Blueprint $table) {
            $table->id();
            $table->string('numero')->unique();
            $table->date('data');
            $table->date('data_necessaria')->nullable();
            $table->string('solicitante');
            $table->string('funcao')->nullable();
            $table->string('setor');
            $table->string('destino_tipo')->nullable();
            $table->string('destino')->nullable();
            $table->string('urgencia')->default('Média');
            $table->string('local_entrega')->nullable();
            $table->text('motivo')->nullable();
            $table->string('status')->default('PENDENTE');
            $table->text('obs_aprovador')->nullable();
            $table->json('itens')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solicitacoes_compra');
    }
};
