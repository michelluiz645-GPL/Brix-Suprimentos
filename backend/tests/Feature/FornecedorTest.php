<?php

namespace Tests\Feature;

use App\Models\Setor;
use App\Models\User;
use Database\Seeders\SetorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FornecedorTest extends TestCase
{
    use RefreshDatabase;

    private User $engAdmin;
    private User $almoxOperador;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SetorSeeder::class);
        $eng = Setor::where('codigo', Setor::ENGENHARIA)->firstOrFail();
        $alm = Setor::where('codigo', Setor::ALMOXARIFADO)->firstOrFail();

        $this->engAdmin = User::create([
            'nome' => 'Eng Admin', 'login' => 'eng.admin', 'email' => 'eng.admin@teste.com',
            'password' => bcrypt('123456'), 'nivel' => 'ADMIN', 'setor_id' => $eng->id, 'ativo' => true,
            'papel' => 'admin_geral',
        ]);
        $this->almoxOperador = User::create([
            'nome' => 'Almox Operador', 'login' => 'almox.op', 'email' => 'almox.op@teste.com',
            'password' => bcrypt('123456'), 'nivel' => 'OPERADOR', 'setor_id' => $alm->id, 'ativo' => true,
            'papel' => 'almoxarife',
        ]);
    }

    public function test_almoxarifado_so_consulta_engenharia_admin_edita(): void
    {
        $this->actingAs($this->almoxOperador)
            ->postJson('/api/fornecedores', ['nome' => 'Fornecedor X'])
            ->assertStatus(403);

        $criado = $this->actingAs($this->engAdmin)
            ->postJson('/api/fornecedores', ['nome' => 'Ferragens Brix', 'cnpj' => '12345678000199'])
            ->assertStatus(201)->json('data');

        $this->actingAs($this->almoxOperador)
            ->getJson('/api/fornecedores')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data.data');

        $this->actingAs($this->almoxOperador)
            ->putJson("/api/fornecedores/{$criado['id']}", ['cidade' => 'Outra'])
            ->assertStatus(403);

        $this->actingAs($this->engAdmin)
            ->putJson("/api/fornecedores/{$criado['id']}", ['cidade' => 'Cuiabá'])
            ->assertStatus(200)
            ->assertJsonPath('data.cidade', 'Cuiabá');
    }

    public function test_nao_permite_cnpj_duplicado(): void
    {
        $this->actingAs($this->engAdmin)->postJson('/api/fornecedores', ['nome' => 'A', 'cnpj' => '111']);

        $this->actingAs($this->engAdmin)
            ->postJson('/api/fornecedores', ['nome' => 'B', 'cnpj' => '111'])
            ->assertStatus(422);
    }
}
