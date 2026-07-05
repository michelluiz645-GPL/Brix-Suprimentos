<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Cotação comparativa entre 3 fornecedores: cada fornecedor tem nome,
     * prazo de entrega e forma de pagamento; cada item do comparativo (os
     * da solicitação original + linhas extras livres como frete/instalação)
     * tem um preço por fornecedor. A Manutenção escolhe UM fornecedor
     * vencedor para o pedido inteiro na aprovação — daí vêm o valor_total,
     * prazo e forma de pagamento definitivos do pedido.
     */
    public function up(): void
    {
        Schema::table('pedidos_orcamento', function (Blueprint $table) {
            $table->json('cotacao_fornecedores')->nullable()->after('valor_total');
            $table->json('cotacao_itens')->nullable()->after('cotacao_fornecedores');
            $table->string('fornecedor_escolhido')->nullable()->after('cotacao_itens');
            $table->string('prazo_entrega_escolhido')->nullable()->after('fornecedor_escolhido');
            $table->string('forma_pagamento_escolhida')->nullable()->after('prazo_entrega_escolhido');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos_orcamento', function (Blueprint $table) {
            $table->dropColumn([
                'cotacao_fornecedores',
                'cotacao_itens',
                'fornecedor_escolhido',
                'prazo_entrega_escolhido',
                'forma_pagamento_escolhida',
            ]);
        });
    }
};
