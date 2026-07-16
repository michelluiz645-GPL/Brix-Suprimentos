<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SolicitacaoCompra extends Model
{
    use SoftDeletes;

    protected $table = 'solicitacoes_compra';

    protected $fillable = [
        'numero', 'data_necessaria', 'solicitante_id', 'funcao_cargo',
        'destino', 'veiculo_frota', 'destino_obra', 'urgencia', 'local_entrega',
        'ponto_referencia', 'horario_recebimento', 'motivo', 'ordem_servico',
        'status',
        'cotacao_fornecedor', 'cotacao_fornecedor_telefone', 'cotacao_fornecedor_email',
        'valor_cotado', 'data_cotacao',
        'data_aprovacao_mnt', 'aprovado_mnt_por',
        'data_aprovacao_sup', 'aprovado_sup_por',
        'data_compra', 'comprado_por', 'previsao_entrega',
        'data_entrada', 'entrada_por',
        'observacao_rejeicao',
    ];

    protected $casts = [
        'data_necessaria'    => 'date',
        'previsao_entrega'   => 'date',
        'data_cotacao'       => 'datetime',
        'data_aprovacao_mnt' => 'datetime',
        'data_aprovacao_sup' => 'datetime',
        'data_compra'        => 'datetime',
        'data_entrada'       => 'datetime',
        'valor_cotado'       => 'decimal:2',
    ];

    public function solicitante(): BelongsTo
    {
        return $this->belongsTo(User::class, 'solicitante_id');
    }

    public function aprovadorMnt(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprovado_mnt_por');
    }

    public function aprovadorSup(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprovado_sup_por');
    }

    public function comprador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'comprado_por');
    }

    public function responsavelEntrada(): BelongsTo
    {
        return $this->belongsTo(User::class, 'entrada_por');
    }

    public function itens(): HasMany
    {
        return $this->hasMany(ItensSc::class, 'sc_id');
    }

    public function todosItensRecebidos(): bool
    {
        return $this->itens()->where('recebido', false)->doesntExist();
    }
}
