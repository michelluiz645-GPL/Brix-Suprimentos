<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('solicitacoes_compra', function (Blueprint $table) {
            $table->string('destino_obra')->nullable()->after('veiculo_frota');
        });
    }

    public function down(): void
    {
        Schema::table('solicitacoes_compra', function (Blueprint $table) {
            $table->dropColumn('destino_obra');
        });
    }
};
