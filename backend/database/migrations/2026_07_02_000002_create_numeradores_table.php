<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('numeradores', function (Blueprint $table) {
            $table->id();
            $table->string('chave')->unique(); // Ex: SC-MNT-2026
            $table->unsignedInteger('ultimo')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('numeradores');
    }
};
