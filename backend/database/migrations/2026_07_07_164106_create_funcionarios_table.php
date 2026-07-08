<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * RF-014 — Funcionários.
     */
    public function up(): void
    {
        Schema::create('funcionarios', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->string('funcao');
            $table->string('equipe_num')->nullable();
            $table->string('cpf')->unique()->nullable();
            $table->string('tel')->nullable();
            $table->enum('status', ['ATIVO', 'INATIVO'])->default('ATIVO');
            $table->boolean('demitido')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('funcionarios');
    }
};
