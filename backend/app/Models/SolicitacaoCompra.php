<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SolicitacaoCompra extends Model
{
    use SoftDeletes;

    protected $table = 'solicitacoes_compra';

    protected $fillable = [
        'numero', 'data', 'data_necessaria', 'solicitante', 'funcao',
        'setor', 'destino_tipo', 'destino', 'urgencia', 'local_entrega',
        'motivo', 'status', 'obs_aprovador', 'itens',
    ];

    protected $casts = [
        'itens' => 'array',
        'data'  => 'date',
        'data_necessaria' => 'date',
    ];
}
