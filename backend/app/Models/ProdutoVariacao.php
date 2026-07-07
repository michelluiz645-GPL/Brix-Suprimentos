<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProdutoVariacao extends Model
{
    use SoftDeletes;

    protected $table = 'produto_variacoes';

    protected $fillable = ['produto_id', 'marca', 'codigo_fabricante', 'preco', 'estoque', 'status'];

    protected $casts = [
        'preco'   => 'decimal:2',
        'estoque' => 'decimal:2',
    ];

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }
}
