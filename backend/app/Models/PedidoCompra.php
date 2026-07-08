<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PedidoCompra extends Model
{
    use SoftDeletes;

    protected $table = 'pedidos_compra';

    protected $fillable = [
        'num_pc', 'data_pedido', 'solicitante', 'setor_origem', 'obra', 'centro_custo', 'num_sc_ref',
        'forn_nome', 'forn_cnpj', 'forn_tel', 'forn_contato', 'forn_email',
        'local_entrega', 'data_desejada', 'cond_pagamento',
        'frete', 'outras_despesas', 'desconto_total', 'itens', 'status', 'origem', 'urgencia', 'criado_por_id',
    ];

    protected $casts = [
        'data_pedido'     => 'date:Y-m-d',
        'data_desejada'   => 'date:Y-m-d',
        'frete'           => 'decimal:2',
        'outras_despesas' => 'decimal:2',
        'desconto_total'  => 'decimal:2',
        'itens'           => 'array',
    ];

    public function criadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'criado_por_id');
    }
}
