<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CombustivelMovimento extends Model
{
    use SoftDeletes;

    protected $table = 'combustivel_movimentos';

    protected $fillable = [
        'tipo', 'combustivel', 'quantidade', 'valor_litro', 'valor',
        'fornecedor', 'frota', 'responsavel', 'data', 'usuario',
    ];

    protected $casts = [
        'quantidade'  => 'decimal:2',
        'valor_litro' => 'decimal:3',
        'valor'       => 'decimal:2',
        'data'        => 'date:Y-m-d',
    ];
}
