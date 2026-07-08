<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * RF-015 — Equipes de Campo. O tipo de operação é obrigatório porque
     * equipes tipo "Manutenção" disparam Nota de Débito automática nas
     * saídas de material (RF-025).
     */
    public function up(): void
    {
        Schema::create('equipes', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->string('numero')->unique();
            $table->string('responsavel')->nullable();
            $table->string('veiculo')->nullable();
            $table->enum('tipo', ['Manutenção', 'Conservação', 'Terraplanagem', 'Roçada', 'Outro']);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipes');
    }
};
