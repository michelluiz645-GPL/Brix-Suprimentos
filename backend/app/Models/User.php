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
        'op_engenharia',
        'admin_engenharia',
        'almoxarife',
        'admin_geral',
    ];

    public const PAPEL_LABELS = [
        'op_manutencao'    => 'Operacional Manutenção',
        'admin_manutencao' => 'Admin Manutenção',
        'op_suprimentos'   => 'Operacional Suprimentos',
        'admin_suprimentos'=> 'Admin Suprimentos',
        'op_engenharia'    => 'Operacional Engenharia',
        'admin_engenharia' => 'Admin Engenharia',
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
            ->withPivot('responsabilidades', 'setores_atendidos');
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
     * global. Admin de nível ADMIN acumula automaticamente as
     * responsabilidades do módulo — exceto em pedido_orcamento, onde (a
     * não ser que o papel seja admin_geral) só acumula as que fazem
     * sentido pro próprio setor: Admin da Engenharia não vira "Cotador de
     * Suprimentos" só por ser Admin.
     */
    public function temResponsabilidade(string $moduloChave, string $responsabilidade): bool
    {
        if ($this->papel === 'admin_geral') {
            return true;
        }

        if ($this->isAdmin()) {
            return $moduloChave === 'pedido_orcamento'
                ? $this->admSetorCobreResponsabilidade($responsabilidade)
                : true;
        }

        $pivot = $this->modulos()->where('chave', $moduloChave)->first()?->pivot;
        $responsabilidades = $pivot?->responsabilidades ?? [];

        return in_array($responsabilidade, $responsabilidades, true);
    }

    private function admSetorCobreResponsabilidade(string $responsabilidade): bool
    {
        $setor = $this->setor?->codigo;

        return match ($responsabilidade) {
            'solicitante' => true,
            'cotador', 'comprador', 'aprovador_suprimentos' => $setor === Setor::ALMOXARIFADO,
            'aprovador_manutencao' => $setor === Setor::MANUTENCAO,
            'aprovador_engenharia' => $setor === Setor::ENGENHARIA,
            default => false,
        };
    }

    /**
     * Além de ter a responsabilidade em si, quem cota/aprova/compra do lado
     * de Suprimentos (cotador/aprovador_suprimentos/comprador) só age num
     * pedido específico se atender o setor de origem dele — configurável por
     * usuário em setores_atendidos (vazio/null = atende todos os setores,
     * mantendo o comportamento anterior a essa configuração existir).
     */
    public function podeAgirEmPedido(string $moduloChave, string $responsabilidade, ?string $setorPedido): bool
    {
        if (! $this->temResponsabilidade($moduloChave, $responsabilidade)) {
            return false;
        }

        // Só limita pedidos vindos de outro setor solicitante (Manutenção/
        // Engenharia) — pedidos do próprio ALMOXARIFADO (Reposição Automática)
        // são "casa" de Suprimentos e continuam liberados pra qualquer um
        // com a responsabilidade, independente de setores_atendidos.
        $respsSuprimentos = ['cotador', 'aprovador_suprimentos', 'comprador'];
        $setoresEscopaveis = [Setor::MANUTENCAO, Setor::ENGENHARIA];
        if (! in_array($responsabilidade, $respsSuprimentos, true) || ! in_array($setorPedido, $setoresEscopaveis, true) || $this->papel === 'admin_geral') {
            return true;
        }

        $pivot = $this->modulos()->where('chave', $moduloChave)->first()?->pivot;
        $setoresAtendidos = $pivot?->setores_atendidos ?? [];

        return empty($setoresAtendidos) || in_array($setorPedido, $setoresAtendidos, true);
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

    /**
     * Mapa {chave_do_modulo: [setores]} — usado junto de responsabilidadesPorModulo
     * pro frontend filtrar as filas de Cotação/Aprovação de Compra pelo que
     * esse usuário de Suprimentos realmente atende.
     */
    public function setoresAtendidosPorModulo(): array
    {
        return $this->modulos->mapWithKeys(
            fn (Modulo $modulo) => [$modulo->chave => $modulo->pivot->setores_atendidos ?? []]
        )->all();
    }
}
