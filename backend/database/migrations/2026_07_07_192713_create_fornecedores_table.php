<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * RF-018 — Fornecedores.
     */
    public function up(): void
    {
        Schema::create('fornecedores', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->string('cnpj')->unique()->nullable();
            $table->string('tel')->nullable();
            $table->string('email')->nullable();
            $table->string('contato')->nullable();
            $table->string('cidade')->nullable();
            $table->string('estado', 2)->nullable();
            $table->text('obs')->nullable();
            $table->enum('status', ['ATIVO', 'INATIVO'])->default('ATIVO');
            $table->foreignId('criado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fornecedores');
    }
};
