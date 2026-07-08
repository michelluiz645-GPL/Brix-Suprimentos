<?php

namespace Tests\Feature;

use App\Models\Setor;
use App\Models\User;
use Database\Seeders\SetorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class KoboTest extends TestCase
{
    use RefreshDatabase;

    private User $usuario;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SetorSeeder::class);
        $setor = Setor::where('codigo', Setor::ALMOXARIFADO)->firstOrFail();
        $this->usuario = User::create([
            'nome' => 'Usuário Teste', 'login' => 'usuario.teste', 'email' => 'usuario.teste@teste.com',
            'password' => bcrypt('123456'), 'nivel' => 'OPERADOR', 'setor_id' => $setor->id, 'ativo' => true,
            'papel' => 'almoxarife',
        ]);
    }

    public function test_sem_credenciais_configuradas_retorna_erro_amigavel_sem_expor_token(): void
    {
        config(['services.kobo.token' => null, 'services.kobo.uid_suprim' => null]);

        $resp = $this->actingAs($this->usuario)->getJson('/api/kobo/suprimentos');

        $resp->assertStatus(502);
        $this->assertStringContainsString('não está configurada', $resp->json('message'));
    }

    public function test_com_credenciais_busca_submissoes_do_kobo(): void
    {
        config([
            'services.kobo.token' => 'fake-token',
            'services.kobo.uid_suprim' => 'abc123',
            'services.kobo.base_url' => 'https://kf.kobotoolbox.org/api/v2',
        ]);

        Http::fake([
            'https://kf.kobotoolbox.org/api/v2/assets/abc123/data.json' => Http::response([
                'results' => [
                    ['_id' => 1, 'solicitante' => 'João', 'obra' => 'Obra X'],
                ],
            ], 200),
        ]);

        $resp = $this->actingAs($this->usuario)->getJson('/api/kobo/suprimentos');

        $resp->assertStatus(200)
            ->assertJsonPath('data.data.0.solicitante', 'João');
    }

    public function test_erro_de_conexao_retorna_mensagem_amigavel(): void
    {
        config([
            'services.kobo.token' => 'fake-token',
            'services.kobo.uid_suprim' => 'abc123',
            'services.kobo.base_url' => 'https://kf.kobotoolbox.org/api/v2',
        ]);

        Http::fake([
            'https://kf.kobotoolbox.org/api/v2/assets/abc123/data.json' => Http::response([], 500),
        ]);

        $this->actingAs($this->usuario)
            ->getJson('/api/kobo/suprimentos')
            ->assertStatus(502)
            ->assertJsonPath('message', 'Não foi possível conectar ao KoboToolbox. Verifique as credenciais em Segurança de Dados.');
    }
}
