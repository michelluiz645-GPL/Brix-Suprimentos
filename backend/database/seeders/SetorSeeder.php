<?php

namespace Database\Seeders;

use App\Models\Setor;
use Illuminate\Database\Seeder;

class SetorSeeder extends Seeder
{
    public function run(): void
    {
        $setores = [
            ['codigo' => Setor::ALMOXARIFADO, 'nome' => 'Almoxarifado'],
            ['codigo' => Setor::ENGENHARIA, 'nome' => 'Engenharia'],
            ['codigo' => Setor::MANUTENCAO, 'nome' => 'Manutenção'],
        ];

        foreach ($setores as $setor) {
            Setor::updateOrCreate(['codigo' => $setor['codigo']], $setor);
        }
    }
}
