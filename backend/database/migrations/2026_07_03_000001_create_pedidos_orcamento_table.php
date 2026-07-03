<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pedidos_orcamento', function (Blueprint $table) {
            $table->id();
            $table->string('numero_sc', 30)->unique();
            $table->date('data');
            $table->string('setor', 30)->default('MANUTENCAO');
            $table->string('solicitante', 150);
            $table->string('destino', 150);
            $table->enum('tipo_destino', ['FROTA', 'OBRA', 'EQUIPAMENTO'])->default('FROTA');
            $table->enum('urgencia', ['CRITICA', 'ALTA', 'MEDIA', 'BAIXA'])->default('MEDIA');
            $table->enum('status', ['PENDENTE','COTANDO','AGUARDANDO_APROVACAO','APROVADO','EM_TRANSITO','CONCLUIDO','REJEITADO'])->default('PENDENTE');
            $table->json('itens');
            $table->decimal('valor_total', 12, 2)->default(0);
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
