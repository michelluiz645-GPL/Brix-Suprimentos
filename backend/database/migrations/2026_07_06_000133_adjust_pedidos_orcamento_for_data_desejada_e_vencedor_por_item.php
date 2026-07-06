<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A escolha do fornecedor vencedor passa a ser POR ITEM (vencedor misto
     * permitido), não mais um único fornecedor para o pedido inteiro — por
     * isso prazo_entrega_escolhido/forma_pagamento_escolhida deixam de fazer
     * sentido como um valor único (cada item pode ter fornecedor e data de
     * entrega diferentes; a forma de pagamento fica por fornecedor dentro do
     * próprio JSON cotacao_fornecedores). fornecedor_escolhido é mantido,
     * mas passa a guardar um resumo (nomes únicos dos fornecedores vencedores).
     */
    public function up(): void
    {
        Schema::table('pedidos_orcamento', function (Blueprint $table) {
            $table->date('data_desejada')->nullable()->after('data');
            $table->dropColumn(['prazo_entrega_escolhido', 'forma_pagamento_escolhida']);
        });
    }

    public function down(): void
    {
        Schema::table('pedidos_orcamento', function (Blueprint $table) {
            $table->dropColumn('data_desejada');
            $table->string('prazo_entrega_escolhido')->nullable()->after('fornecedor_escolhido');
            $table->string('forma_pagamento_escolhida')->nullable()->after('prazo_entrega_escolhido');
        });
    }
};
