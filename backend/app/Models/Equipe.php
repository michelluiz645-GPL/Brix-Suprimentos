<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Equipe extends Model
{
    use SoftDeletes;

    protected $fillable = ['nome', 'numero', 'responsavel', 'veiculo', 'tipo'];
}
