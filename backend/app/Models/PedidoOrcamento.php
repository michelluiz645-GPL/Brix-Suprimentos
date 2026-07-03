<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PedidoOrcamento extends Model
{
    use SoftDeletes;

    protected $table = 'pedidos_orcamento';

    protected $fillable = [
        'numero_sc', 'data', 'setor', 'solicitante',
        'destino', 'tipo_destino', 'urgencia', 'status',
        'itens', 'valor_total', 'timeline',
    ];

    protected $casts = [
        'itens'    => 'array',
        'timeline' => 'array',
        'data'     => 'date:Y-m-d',
    ];
}
