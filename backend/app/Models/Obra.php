<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Obra extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'setor', 'nome', 'tipo', 'descricao', 'responsavel',
        'data_inicio', 'data_prev', 'centro_custo', 'status', 'criado_por_id',
    ];

    protected $casts = [
        'data_inicio' => 'date:Y-m-d',
        'data_prev'   => 'date:Y-m-d',
    ];

    public function criadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'criado_por_id');
    }
}
