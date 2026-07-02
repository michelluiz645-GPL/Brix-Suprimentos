<?php

namespace Database\Seeders;

use App\Models\Setor;
use App\Models\User;
use App\Services\PermissaoService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $almoxarifado = Setor::where('codigo', Setor::ALMOXARIFADO)->firstOrFail();

        $admin = User::updateOrCreate(
            ['login' => 'admin'],
            [
                'nome'     => 'Administrador',
                'email'    => 'admin@admin.com',
                'password' => Hash::make('123456'),
                'nivel'    => User::NIVEL_ADMIN,
                'papel'    => 'admin_geral',
                'setor_id' => $almoxarifado->id,
                'ativo'    => true,
            ]
        );

        app(PermissaoService::class)->aplicarTemplatePadrao($admin);
    }
}
