<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    /**
     * Pra quem tem responsabilidade de cotador/aprovador_suprimentos/comprador
     * em pedido_orcamento, define de quais setores solicitantes (Manutenção,
     * Engenharia) essa pessoa recebe pedido — null/vazio = recebe de todos
     * (comportamento atual, mantém compatibilidade com quem já está configurado).
     */
    public function up(): void
    {
        Schema::table('user_modulo', function (Blueprint $table) {
            $table->json('setores_atendidos')->nullable()->after('responsabilidades');
        });
    }

    public function down(): void
    {
        Schema::table('user_modulo', function (Blueprint $table) {
            $table->dropColumn('setores_atendidos');
        });
    }
};
