<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->string('login', 60)->unique();
            $table->string('email')->unique();
            $table->string('password');
            $table->enum('nivel', ['ADMIN', 'OPERADOR'])->default('OPERADOR');
            $table->foreignId('setor_id')->constrained('setores');
            $table->boolean('ativo')->default(true);
            $table->rememberToken();
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
