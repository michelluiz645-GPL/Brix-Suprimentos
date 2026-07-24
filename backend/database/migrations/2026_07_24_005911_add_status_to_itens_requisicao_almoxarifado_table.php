<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Separação parcial: cada item pode ser separado agora, marcado como
     * indisponível ("não vamos ter esse item") ou deixado pendente pra
     * decidir depois — a requisição só vira CONCLUIDA quando nenhum item
     * mais estiver PENDENTE.
     */
    public function up(): void
    {
        Schema::table('itens_requisicao_almoxarifado', function (Blueprint $table) {
            $table->enum('status', ['PENDENTE', 'SEPARADO', 'INDISPONIVEL'])->default('PENDENTE')->after('observacao');
            $table->string('numero_pedido_saida')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('itens_requisicao_almoxarifado', function (Blueprint $table) {
            $table->dropColumn(['status', 'numero_pedido_saida']);
        });
    }
};
