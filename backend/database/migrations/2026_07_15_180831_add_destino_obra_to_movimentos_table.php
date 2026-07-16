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
     * Saída com destino "Obra" precisa registrar qual obra, do mesmo jeito
     * que destino "Frota" já guarda a placa em destino_frota.
     */
    public function up(): void
    {
        Schema::table('movimentos', function (Blueprint $table) {
            $table->string('destino_obra')->nullable()->after('destino_frota');
        });
    }

    public function down(): void
    {
        Schema::table('movimentos', function (Blueprint $table) {
            $table->dropColumn('destino_obra');
        });
    }
};
