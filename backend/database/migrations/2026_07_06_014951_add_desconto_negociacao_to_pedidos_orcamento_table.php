<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Desconto que o comprador consegue negociar direto com o fornecedor na
     * hora da compra (registrarCompra) — registrado à parte do valor_total
     * já aprovado, para servir de relatório (quanto de economia veio da
     * negociação, além da já obtida na escolha do fornecedor mais barato).
     */
    public function up(): void
    {
        Schema::table('pedidos_orcamento', function (Blueprint $table) {
            $table->decimal('desconto_negociacao', 12, 2)->default(0)->after('valor_total');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos_orcamento', function (Blueprint $table) {
            $table->dropColumn('desconto_negociacao');
        });
    }
};
