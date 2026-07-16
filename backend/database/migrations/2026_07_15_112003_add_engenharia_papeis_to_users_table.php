<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Engenharia ganha papéis próprios (op_engenharia/admin_engenharia),
     * espelhando op_manutencao/admin_manutencao — usados no fluxo de
     * Pedido de Orçamento com destino Obra em vez de Frota/Equipamento.
     * MySQL guarda o ENUM como tipo nativo e precisa de ALTER; no SQLite
     * de teste os valores já vêm no CREATE original (ver
     * add_papel_whatsapp_to_users_table), então não há nada a fazer aqui.
     */
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY papel ENUM(
                'op_manutencao', 'admin_manutencao',
                'op_suprimentos', 'admin_suprimentos',
                'op_engenharia', 'admin_engenharia',
                'almoxarife', 'admin_geral'
            ) NOT NULL DEFAULT 'op_manutencao'");
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY papel ENUM(
                'op_manutencao', 'admin_manutencao',
                'op_suprimentos', 'admin_suprimentos',
                'almoxarife', 'admin_geral'
            ) NOT NULL DEFAULT 'op_manutencao'");
        }
    }
};
