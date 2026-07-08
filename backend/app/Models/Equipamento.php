<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Equipamento extends Model
{
    use SoftDeletes;

    protected $fillable = ['nome', 'tipo', 'serie', 'equipe', 'obs', 'status'];
}
