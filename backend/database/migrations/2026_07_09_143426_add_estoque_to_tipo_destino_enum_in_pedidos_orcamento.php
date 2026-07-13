<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * RF-029 — Reposição Automática cria um Pedido de Orçamento com destino
     * "ESTOQUE" (reposição geral do Almoxarifado, não vinculado a uma
     * frota/obra/equipamento específico). MySQL guarda o ENUM como tipo
     * nativo e precisa de ALTER; no SQLite de teste o valor já vem incluído
     * desde a criação da tabela (ver recreate_pedidos_orcamento_table), então
     * não há nada a fazer aqui.
     */
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE pedidos_orcamento MODIFY tipo_destino ENUM('FROTA', 'OBRA', 'EQUIPAMENTO', 'ESTOQUE') NOT NULL DEFAULT 'FROTA'");
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE pedidos_orcamento MODIFY tipo_destino ENUM('FROTA', 'OBRA', 'EQUIPAMENTO') NOT NULL DEFAULT 'FROTA'");
        }
    }
};
