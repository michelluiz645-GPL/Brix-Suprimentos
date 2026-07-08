<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Funcionario extends Model
{
    use SoftDeletes;

    protected $fillable = ['nome', 'funcao', 'equipe_num', 'cpf', 'tel', 'status', 'demitido'];

    protected $casts = [
        'demitido' => 'boolean',
    ];
}
