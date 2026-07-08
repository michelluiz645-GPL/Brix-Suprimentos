<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * RF-023 — Segurança & EPI.
     */
    public function up(): void
    {
        Schema::create('epi_registros', function (Blueprint $table) {
            $table->id();
            $table->string('funcionario');
            $table->string('epi');
            $table->date('data_entrega');
            $table->date('proxima_troca');
            $table->string('responsavel');
            $table->text('obs')->nullable();
            $table->string('registrado_por')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('epi_registros');
    }
};
