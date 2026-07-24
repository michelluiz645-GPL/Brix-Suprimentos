<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('itens_requisicao_almoxarifado', function (Blueprint $table) {
            $table->string('destino_equipe')->nullable()->after('destino');
        });
    }

    public function down(): void
    {
        Schema::table('itens_requisicao_almoxarifado', function (Blueprint $table) {
            $table->dropColumn('destino_equipe');
        });
    }
};
