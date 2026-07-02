<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Numerador extends Model
{
    protected $table    = 'numeradores';
    protected $fillable = ['chave', 'ultimo'];
}
