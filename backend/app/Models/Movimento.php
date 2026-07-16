<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Movimento extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'numero_pedido', 'tipo', 'numero_nf', 'codigo', 'produto_variacao_id',
        'nome', 'unid', 'qtd', 'preco', 'fornecedor', 'obs', 'almoxarifado',
        'responsavel', 'data', 'usuario',
        'equipe', 'nome_equipe', 'colaborador', 'colaborador_epi',
        'destino_frota', 'destino_obra', 'destino', 'tipo_saida', 'entregador', 'epi_vencimento', 'status',
        'numero_pedido_origem', 'danificado', 'confirmado_por', 'data_confirmacao',
    ];

    protected $casts = [
        'qtd'   => 'decimal:2',
        'preco' => 'decimal:2',
        'data'  => 'date:Y-m-d',
        'epi_vencimento' => 'date:Y-m-d',
        'danificado' => 'boolean',
        'data_confirmacao' => 'date:Y-m-d',
    ];

    public function produtoVariacao(): BelongsTo
    {
        return $this->belongsTo(ProdutoVariacao::class);
    }
}
