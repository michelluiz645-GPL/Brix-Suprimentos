<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('solicitacoes_compra');

        Schema::create('solicitacoes_compra', function (Blueprint $table) {
            $table->id();
            $table->string('numero')->unique();                    // SC-MNT-2026-001
            $table->date('data_necessaria')->nullable();
            $table->foreignId('solicitante_id')->constrained('users')->onDelete('cascade');
            $table->string('funcao_cargo')->nullable();
            $table->enum('destino', ['Frota', 'Obra', 'Administração', 'Manutenção', 'Outros']);
            $table->string('veiculo_frota')->nullable();
            $table->enum('urgencia', ['Baixa', 'Média', 'Alta', 'Crítica'])->default('Média');
            $table->string('local_entrega')->nullable();
            $table->string('ponto_referencia')->nullable();
            $table->time('horario_recebimento')->nullable();
            $table->text('motivo')->nullable();
            $table->string('ordem_servico')->nullable();

            $table->enum('status', [
                'pendente',
                'cotando',
                'aguardando_aprovacao_mnt',
                'aguardando_aprovacao_sup',
                'aprovado',
                'comprado',
                'em_transito',
                'concluido',
                'rejeitado',
            ])->default('pendente');

            $table->string('cotacao_fornecedor')->nullable();
            $table->string('cotacao_fornecedor_telefone')->nullable();
            $table->string('cotacao_fornecedor_email')->nullable();
            $table->decimal('valor_cotado', 10, 2)->nullable();
            $table->datetime('data_cotacao')->nullable();

            $table->datetime('data_aprovacao_mnt')->nullable();
            $table->foreignId('aprovado_mnt_por')->nullable()->constrained('users')->nullOnDelete();

            $table->datetime('data_aprovacao_sup')->nullable();
            $table->foreignId('aprovado_sup_por')->nullable()->constrained('users')->nullOnDelete();

            $table->datetime('data_compra')->nullable();
            $table->foreignId('comprado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->date('previsao_entrega')->nullable();

            $table->datetime('data_entrada')->nullable();
            $table->foreignId('entrada_por')->nullable()->constrained('users')->nullOnDelete();

            $table->text('observacao_rejeicao')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solicitacoes_compra');
    }
};
