<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Catálogo de todos os módulos existentes no sistema (RF-002/RF-027).
     * O campo `setores_aplicaveis` guarda em JSON quais setores podem
     * selecionar este módulo na tela de permissões (RN-002.1) — um módulo
     * pode ser aplicável a mais de um setor (ex.: "Pedido de Compra" é
     * usado tanto por Engenharia quanto por Manutenção).
     */
    public function up(): void
    {
        Schema::create('modulos', function (Blueprint $table) {
            $table->id();
            $table->string('chave', 60)->unique(); // ex.: dashboard, registrar_saida, pedido_compra
            $table->string('nome');
            $table->json('setores_aplicaveis'); // ["ALMOXARIFADO"] | ["ENGENHARIA","MANUTENCAO"]
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('modulos');
    }
};
