<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Recria pedidos_orcamento com dupla aprovação (Manutenção → Suprimentos)
     * e registro de quem executou cada etapa (server-side, não mais um
     * "feito_por" livre vindo do client). Segue o mesmo padrão já usado em
     * solicitacoes_compra (ver 2026_07_02_000003_recreate_solicitacoes_compra_table).
     */
    public function up(): void
    {
        Schema::dropIfExists('pedidos_orcamento');

        Schema::create('pedidos_orcamento', function (Blueprint $table) {
            $table->id();
            $table->string('numero_sc', 30)->unique();
            $table->date('data');
            $table->string('setor', 30)->default('MANUTENCAO');

            $table->foreignId('solicitante_id')->constrained('users')->onDelete('cascade');

            $table->string('destino', 150);
            $table->enum('tipo_destino', ['FROTA', 'OBRA', 'EQUIPAMENTO', 'ESTOQUE'])->default('FROTA');
            $table->enum('urgencia', ['CRITICA', 'ALTA', 'MEDIA', 'BAIXA'])->default('MEDIA');

            $table->enum('status', [
                'PENDENTE',
                'COTANDO',
                'AGUARDANDO_APROVACAO_MANUTENCAO',
                'AGUARDANDO_APROVACAO_COMPRA',
                'APROVADO',
                'EM_TRANSITO',
                'CONCLUIDO',
                'REJEITADO',
            ])->default('PENDENTE');

            $table->json('itens');
            $table->decimal('valor_total', 12, 2)->default(0);

            $table->datetime('data_cotacao')->nullable();
            $table->foreignId('cotado_por_id')->nullable()->constrained('users')->nullOnDelete();

            $table->datetime('data_aprovacao_manutencao')->nullable();
            $table->foreignId('aprovado_manutencao_por_id')->nullable()->constrained('users')->nullOnDelete();

            $table->datetime('data_aprovacao_compra')->nullable();
            $table->foreignId('aprovado_compra_por_id')->nullable()->constrained('users')->nullOnDelete();

            $table->datetime('data_compra')->nullable();
            $table->foreignId('comprado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('data_prevista_recebimento')->nullable();

            $table->datetime('data_recebimento')->nullable();
            $table->foreignId('recebido_por_id')->nullable()->constrained('users')->nullOnDelete();

            $table->text('motivo_rejeicao')->nullable();

            $table->json('timeline');

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pedidos_orcamento');
    }
};
