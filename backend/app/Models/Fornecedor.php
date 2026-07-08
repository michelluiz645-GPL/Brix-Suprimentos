<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Fornecedor extends Model
{
    use SoftDeletes;

    protected $table = 'fornecedores';

    protected $fillable = ['nome', 'cnpj', 'tel', 'email', 'contato', 'cidade', 'estado', 'obs', 'status', 'criado_por_id'];

    public function criadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'criado_por_id');
    }
}
