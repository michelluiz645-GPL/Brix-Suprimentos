<?php

namespace Tests\Feature;

use App\Models\Setor;
use App\Models\User;
use Database\Seeders\SetorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SistemaTest extends TestCase
{
    use RefreshDatabase;

    private User $almoxAdmin;
    private User $manutAdmin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SetorSeeder::class);
        $alm = Setor::where('codigo', Setor::ALMOXARIFADO)->firstOrFail();
        $man = Setor::where('codigo', Setor::MANUTENCAO)->firstOrFail();

        $this->almoxAdmin = User::create([
            'nome' => 'Almox Admin', 'login' => 'almox.admin', 'email' => 'almox.admin@teste.com',
            'password' => bcrypt('123456'), 'nivel' => 'ADMIN', 'setor_id' => $alm->id, 'ativo' => true,
            'papel' => 'admin_geral',
        ]);
        $this->manutAdmin = User::create([
            'nome' => 'Manut Admin', 'login' => 'manut.admin', 'email' => 'manut.admin@teste.com',
            'password' => bcrypt('123456'), 'nivel' => 'ADMIN', 'setor_id' => $man->id, 'ativo' => true,
            'papel' => 'admin_manutencao',
        ]);
    }

    public function test_status_reporta_conexao_e_configuracao_do_kobo_sem_expor_token(): void
    {
        config(['services.kobo.token' => 'algo', 'services.kobo.uid_suprim' => 'algo']);

        $resp = $this->actingAs($this->almoxAdmin)->getJson('/api/sistema/status');

        $resp->assertStatus(200)
            ->assertJsonPath('connected', true)
            ->assertJsonPath('kobo_configurado', true);

        $this->assertStringNotContainsString('algo', json_encode($resp->json()));
    }

    public function test_backup_e_historico_restritos_a_admin_do_almoxarifado_ou_engenharia(): void
    {
        $this->actingAs($this->manutAdmin)->getJson('/api/sistema/backup')->assertStatus(403);
        $this->actingAs($this->manutAdmin)->getJson('/api/sistema/historico')->assertStatus(403);

        // Almox Admin passa da checagem de permissão (o resultado do backup em si
        // depende de mysqldump/conexão mysql, indisponível no ambiente de teste sqlite)
        $this->actingAs($this->almoxAdmin)->getJson('/api/sistema/historico')->assertStatus(200);
    }
}
