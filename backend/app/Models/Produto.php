<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Produto extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'codigo_produto',
        'nome',
        'categoria',
        'unid',
        'preco',
        'estoque',
        'estoque_min',
        'estoque_max',
        'armario',
        'prateleira',
        'dias_validade_epi',
        'status',
    ];

    protected $casts = [
        'preco'       => 'float',
        'estoque'     => 'float',
        'estoque_min' => 'float',
        'estoque_max' => 'float',
    ];

    public function movimentos()
    {
        return $this->hasMany(Movimento::class, 'codigo', 'codigo_produto');
    }
}
