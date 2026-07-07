<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * RF-011 — Fichas de Produtos. "Localização" do CLAUDE.md vira dois
     * campos (armario + prateleira), já que é assim que a tela usa.
     *
     * Preço e estoque não ficam aqui — vivem em produto_variacoes, já que um
     * mesmo item interno pode ter várias marcas equivalentes (ex.: filtro
     * WEGA FCD4000 e TECFIL PSC706), cada uma com seu próprio preço e estoque
     * físico. Este produto "genérico" só guarda os limites agregados
     * (estoque_min/estoque_max), somando todas as marcas.
     */
    public function up(): void
    {
        Schema::create('produtos', function (Blueprint $table) {
            $table->id();
            $table->string('codigo_produto')->unique();
            $table->string('nome');
            $table->string('categoria');
            $table->string('unid', 20);
            $table->decimal('estoque_min', 12, 2)->default(0);
            $table->decimal('estoque_max', 12, 2)->default(0);
            $table->string('armario')->nullable();
            $table->string('prateleira')->nullable();
            $table->unsignedInteger('dias_validade_epi')->nullable();
            $table->enum('status', ['ATIVO', 'INATIVO'])->default('ATIVO');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('produtos');
    }
};
