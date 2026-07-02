<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Setor extends Model
{
    protected $table = 'setores';

    protected $fillable = ['codigo', 'nome'];

    public const ALMOXARIFADO = 'ALMOXARIFADO';
    public const ENGENHARIA = 'ENGENHARIA';
    public const MANUTENCAO = 'MANUTENCAO';

    public function usuarios(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
