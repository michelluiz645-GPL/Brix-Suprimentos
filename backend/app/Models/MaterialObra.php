<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class MaterialObra extends Model
{
    use SoftDeletes;

    protected $table = 'materiais_obra';

    protected $fillable = ['codigo', 'nome', 'categoria', 'unidade', 'especificacao', 'obs', 'status'];
}
