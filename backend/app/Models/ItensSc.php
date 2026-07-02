<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItensSc extends Model
{
    protected $table = 'itens_sc';

    protected $fillable = [
        'sc_id', 'descricao', 'quantidade', 'unidade',
        'fabricante', 'part_number', 'aplicacao_equipamento',
        'foto_path', 'recebido', 'quantidade_recebida',
    ];

    protected $casts = [
        'quantidade'          => 'decimal:2',
        'quantidade_recebida' => 'decimal:2',
        'recebido'            => 'boolean',
    ];

    public function sc(): BelongsTo
    {
        return $this->belongsTo(SolicitacaoCompra::class, 'sc_id');
    }
}
