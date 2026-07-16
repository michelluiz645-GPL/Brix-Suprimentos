<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('papel', [
                'op_manutencao',
                'admin_manutencao',
                'op_suprimentos',
                'admin_suprimentos',
                'op_engenharia',
                'admin_engenharia',
                'almoxarife',
                'admin_geral',
            ])->default('op_manutencao')->after('nivel');

            $table->string('whatsapp', 20)->nullable()->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['papel', 'whatsapp']);
        });
    }
};
