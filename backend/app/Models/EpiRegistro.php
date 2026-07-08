<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EpiRegistro extends Model
{
    use SoftDeletes;

    protected $table = 'epi_registros';

    protected $fillable = ['funcionario', 'epi', 'data_entrega', 'proxima_troca', 'responsavel', 'obs', 'registrado_por'];

    protected $casts = [
        'data_entrega'  => 'date:Y-m-d',
        'proxima_troca' => 'date:Y-m-d',
    ];
}
