<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class RequisicaoAlmoxarifado extends Model
{
    use SoftDeletes;

    protected $table = 'requisicoes_almoxarifado';

    protected $fillable = [
        'numero', 'solicitante_id', 'setor', 'data', 'data_desejada', 'urgencia', 'justificativa', 'status',
        'aprovado_por_id', 'data_aprovacao',
        'rejeitado_por_id', 'data_rejeicao', 'motivo_rejeicao',
        'cancelado_por_id', 'data_cancelamento', 'motivo_cancelamento',
        'separado_por_id', 'data_separacao', 'numero_pedido_saida',
    ];

    protected $casts = [
        'data'              => 'date',
        'data_desejada'     => 'date',
        'data_aprovacao'    => 'datetime',
        'data_rejeicao'     => 'datetime',
        'data_cancelamento' => 'datetime',
        'data_separacao'    => 'datetime',
    ];

    public function solicitante(): BelongsTo
    {
        return $this->belongsTo(User::class, 'solicitante_id');
    }

    public function aprovadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprovado_por_id');
    }

    public function rejeitadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejeitado_por_id');
    }

    public function canceladoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelado_por_id');
    }

    public function separadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'separado_por_id');
    }

    public function itens(): HasMany
    {
        return $this->hasMany(ItemRequisicaoAlmoxarifado::class, 'requisicao_id');
    }
}
