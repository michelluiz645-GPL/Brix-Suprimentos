<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    public const NIVEL_ADMIN    = 'ADMIN';
    public const NIVEL_OPERADOR = 'OPERADOR';

    public const PAPEIS = [
        'op_manutencao',
        'admin_manutencao',
        'op_suprimentos',
        'admin_suprimentos',
        'almoxarife',
        'admin_geral',
    ];

    public const PAPEL_LABELS = [
        'op_manutencao'    => 'Operacional Manutenção',
        'admin_manutencao' => 'Admin Manutenção',
        'op_suprimentos'   => 'Operacional Suprimentos',
        'admin_suprimentos'=> 'Admin Suprimentos',
        'almoxarife'       => 'Almoxarife',
        'admin_geral'      => 'Administrador Geral',
    ];

    protected $fillable = [
        'nome', 'login', 'email', 'whatsapp', 'password',
        'nivel', 'papel', 'setor_id', 'ativo',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password'          => 'hashed',
        'ativo'             => 'boolean',
    ];

    public function setor(): BelongsTo
    {
        return $this->belongsTo(Setor::class);
    }

    public function modulos(): BelongsToMany
    {
        return $this->belongsToMany(Modulo::class, 'user_modulo')
            ->using(UserModulo::class)
            ->withPivot('responsabilidades');
    }

    public function temModulo(string $chave): bool
    {
        if ($this->nivel === self::NIVEL_ADMIN && $chave === 'administracao_usuarios') {
            return true;
        }
        return $this->modulos()->where('chave', $chave)->exists();
    }

    public function isAdmin(): bool
    {
        return $this->nivel === self::NIVEL_ADMIN;
    }

    public function temPapel(string ...$papeis): bool
    {
        return in_array($this->papel, $papeis, true) || $this->papel === 'admin_geral';
    }

    /**
     * Responsabilidades granulares do usuário DENTRO de um módulo (ex.:
     * "cotador"/"comprador" em pedido_orcamento), independentes do papel
     * global. Admin de nível ADMIN acumula todas as responsabilidades
     * do módulo automaticamente.
     */
    public function temResponsabilidade(string $moduloChave, string $responsabilidade): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        $pivot = $this->modulos()->where('chave', $moduloChave)->first()?->pivot;
        $responsabilidades = $pivot?->responsabilidades ?? [];

        return in_array($responsabilidade, $responsabilidades, true);
    }

    /**
     * Mapa {chave_do_modulo: [responsabilidades]} usado para expor ao
     * frontend quais botões/ações o usuário pode acionar em cada módulo.
     */
    public function responsabilidadesPorModulo(): array
    {
        return $this->modulos->mapWithKeys(
            fn (Modulo $modulo) => [$modulo->chave => $modulo->pivot->responsabilidades ?? []]
        )->all();
    }
}
