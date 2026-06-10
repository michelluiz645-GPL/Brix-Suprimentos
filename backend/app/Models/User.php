<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, SoftDeletes;

    protected $fillable = [
        'login',
        'nome',
        'senha',
        'nivel',
        'setor',
        'modulos',
    ];

    protected $hidden = ['senha', 'remember_token'];

    protected $casts = [
        'modulos' => 'array',
    ];

    public function getAuthPassword(): string
    {
        return $this->senha;
    }
}
