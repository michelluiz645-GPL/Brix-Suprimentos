<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * RF-025 — EPI nunca é cobrado da equipe (MATERIAL vs EPI), mas passa a
     * gerar sua própria linha no histórico de débitos, só que sinalizada
     * como informativa, não como algo em aberto pra pagar.
     */
    public function up(): void
    {
        Schema::table('debitos_manutencao', function (Blueprint $table) {
            $table->enum('natureza', ['MATERIAL', 'EPI'])->default('MATERIAL')->after('itens');
        });
    }

    public function down(): void
    {
        Schema::table('debitos_manutencao', function (Blueprint $table) {
            $table->dropColumn('natureza');
        });
    }
};
