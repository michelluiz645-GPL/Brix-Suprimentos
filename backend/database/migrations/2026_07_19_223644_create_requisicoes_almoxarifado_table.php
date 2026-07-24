<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('requisicoes_almoxarifado', function (Blueprint $table) {
            $table->id();
            $table->string('numero')->unique();
            $table->foreignId('solicitante_id')->constrained('users');
            $table->string('setor');
            $table->date('data');
            $table->enum('urgencia', ['Baixa', 'Média', 'Alta'])->default('Média');
            $table->text('justificativa')->nullable();
            $table->enum('status', ['PENDENTE', 'APROVADA', 'REJEITADA', 'CANCELADA', 'CONCLUIDA'])->default('PENDENTE');

            $table->foreignId('aprovado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('data_aprovacao')->nullable();

            $table->foreignId('rejeitado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('data_rejeicao')->nullable();
            $table->text('motivo_rejeicao')->nullable();

            $table->foreignId('cancelado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('data_cancelamento')->nullable();
            $table->text('motivo_cancelamento')->nullable();

            $table->foreignId('separado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('data_separacao')->nullable();
            $table->string('numero_pedido_saida')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('requisicoes_almoxarifado');
    }
};
