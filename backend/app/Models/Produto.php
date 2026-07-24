<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Produto extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'codigo_produto', 'nome', 'categoria', 'unid',
        'estoque_min', 'estoque_max', 'armario', 'prateleira',
        'dias_validade_epi', 'marca_obrigatoria', 'status',
    ];

    protected $casts = [
        'estoque_min'       => 'decimal:2',
        'estoque_max'       => 'decimal:2',
        'marca_obrigatoria' => 'boolean',
    ];

    public function variacoes(): HasMany
    {
        return $this->hasMany(ProdutoVariacao::class);
    }
}
