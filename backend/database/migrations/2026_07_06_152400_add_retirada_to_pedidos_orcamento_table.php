<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A compra fica CONCLUIDA assim que o material chega no Almoxarifado
     * (confirmarRecebimento) — a retirada física por parte da Manutenção é
     * rastreada à parte, sem virar mais um status no fluxo principal, já
     * que "concluído mas ainda não retirado" e "concluído e já retirado"
     * são a mesma etapa do ponto de vista da compra em si.
     */
    public function up(): void
    {
        Schema::table('pedidos_orcamento', function (Blueprint $table) {
            $table->datetime('data_retirada')->nullable()->after('data_recebimento');
            $table->foreignId('retirado_por_id')->nullable()->after('data_retirada')
                ->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pedidos_orcamento', function (Blueprint $table) {
            $table->dropConstrainedForeignId('retirado_por_id');
            $table->dropColumn('data_retirada');
        });
    }
};
