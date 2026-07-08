<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DebitoManutencao extends Model
{
    use SoftDeletes;

    protected $table = 'debitos_manutencao';

    protected $fillable = [
        'numero', 'pedido_origem', 'data', 'equipe', 'nome_equipe', 'colaborador',
        'almoxarifado', 'itens', 'total', 'status', 'registrado_por', 'data_pagamento',
    ];

    protected $casts = [
        'data'           => 'date:Y-m-d',
        'data_pagamento' => 'date:Y-m-d',
        'itens'          => 'array',
        'total'          => 'decimal:2',
    ];
}
