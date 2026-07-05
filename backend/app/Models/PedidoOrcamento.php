<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PedidoOrcamento extends Model
{
    use SoftDeletes;

    protected $table = 'pedidos_orcamento';

    protected $fillable = [
        'numero_sc', 'data', 'setor', 'solicitante_id',
        'destino', 'tipo_destino', 'urgencia', 'status',
        'itens', 'valor_total',
        'data_cotacao', 'cotado_por_id',
        'data_aprovacao_manutencao', 'aprovado_manutencao_por_id',
        'data_aprovacao_compra', 'aprovado_compra_por_id',
        'data_compra', 'comprado_por_id', 'data_prevista_recebimento',
        'data_recebimento', 'recebido_por_id',
        'motivo_rejeicao', 'timeline',
    ];

    protected $casts = [
        'itens'    => 'array',
        'timeline' => 'array',
        'data'     => 'date:Y-m-d',
        'data_prevista_recebimento' => 'date:Y-m-d',
        'data_cotacao' => 'datetime',
        'data_aprovacao_manutencao' => 'datetime',
        'data_aprovacao_compra' => 'datetime',
        'data_compra' => 'datetime',
        'data_recebimento' => 'datetime',
    ];

    public function solicitante(): BelongsTo
    {
        return $this->belongsTo(User::class, 'solicitante_id');
    }

    public function cotadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cotado_por_id');
    }

    public function aprovadoManutencaoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprovado_manutencao_por_id');
    }

    public function aprovadoCompraPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprovado_compra_por_id');
    }

    public function compradoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'comprado_por_id');
    }

    public function recebidoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recebido_por_id');
    }
}
