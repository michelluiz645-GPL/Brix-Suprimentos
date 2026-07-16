<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Modulo extends Model
{
    protected $fillable = ['chave', 'nome', 'setores_aplicaveis'];

    protected $casts = [
        'setores_aplicaveis' => 'array',
    ];

    public const RESPONSABILIDADES_PEDIDO_ORCAMENTO = [
        'solicitante',
        'cotador',
        'aprovador_manutencao',
        'aprovador_suprimentos',
        'aprovador_engenharia',
        'comprador',
    ];

    public function usuarios(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_modulo')
            ->using(UserModulo::class)
            ->withPivot('responsabilidades', 'setores_atendidos');
    }

    /**
     * Verifica se este módulo pode ser selecionado para um determinado
     * código de setor (RN-002.1).
     */
    public function disponivelParaSetor(string $codigoSetor): bool
    {
        return in_array($codigoSetor, $this->setores_aplicaveis, true);
    }
}
