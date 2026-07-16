<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class UserModulo extends Pivot
{
    protected $table = 'user_modulo';

    protected $casts = [
        'responsabilidades'  => 'array',
        'setores_atendidos'  => 'array',
    ];
}
