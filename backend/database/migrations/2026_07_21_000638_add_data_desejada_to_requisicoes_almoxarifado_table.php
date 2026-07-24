<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('requisicoes_almoxarifado', function (Blueprint $table) {
            $table->date('data_desejada')->nullable()->after('data');
        });
    }

    public function down(): void
    {
        Schema::table('requisicoes_almoxarifado', function (Blueprint $table) {
            $table->dropColumn('data_desejada');
        });
    }
};
