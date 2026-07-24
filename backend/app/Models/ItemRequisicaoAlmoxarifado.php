<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItemRequisicaoAlmoxarifado extends Model
{
    protected $table = 'itens_requisicao_almoxarifado';

    protected $fillable = [
        'requisicao_id', 'produto_id', 'produto_variacao_id', 'quantidade',
        'destino', 'destino_equipe', 'destino_frota', 'destino_obra', 'colaborador_epi', 'observacao',
        'status', 'numero_pedido_saida',
    ];

    protected $casts = [
        'quantidade' => 'decimal:2',
    ];

    public function requisicao(): BelongsTo
    {
        return $this->belongsTo(RequisicaoAlmoxarifado::class, 'requisicao_id');
    }

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }

    public function produtoVariacao(): BelongsTo
    {
        return $this->belongsTo(ProdutoVariacao::class, 'produto_variacao_id');
    }
}
