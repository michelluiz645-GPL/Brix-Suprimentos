<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Responsabilidades granulares do usuário DENTRO de um módulo específico
     * (ex.: solicitante/cotador/aprovador/comprador em "Pedido de Orçamento"),
     * independente do papel/setor global do usuário. Um usuário pode acumular
     * mais de uma responsabilidade no mesmo módulo.
     */
    public function up(): void
    {
        Schema::table('user_modulo', function (Blueprint $table) {
            $table->json('responsabilidades')->nullable()->after('modulo_id');
        });
    }

    public function down(): void
    {
        Schema::table('user_modulo', function (Blueprint $table) {
            $table->dropColumn('responsabilidades');
        });
    }
};
