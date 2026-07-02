<?php

namespace App\Services;

use App\Models\Modulo;
use App\Models\Setor;
use App\Models\User;

/**
 * Materializa a "Matriz de Permissões (template padrão por setor/nível)"
 * do CLAUDE.md. Usado apenas para PRÉ-POPULAR a lista de módulos de um
 * usuário recém-criado (RF-027.2) — depois disso, a customização é
 * sempre individual via tela de permissões (RN-002.2).
 */
class PermissaoService
{
    /**
     * Chaves de módulo por setor, separadas por nível.
     * Espelha 1:1 a tabela "Matriz de Permissões" do CLAUDE.md.
     */
    private const TEMPLATE = [
        Setor::ALMOXARIFADO => [
            User::NIVEL_OPERADOR => [
                'dashboard', 'consultar_catalogo', 'registrar_entrada', 'registrar_saida',
                'historico_cupons', 'devolucao', 'entregas_pendentes', 'combustiveis',
                'funcionarios', 'equipes_campo', 'frotas_veiculos', 'reposicao_automatica',
            ],
            User::NIVEL_ADMIN => [
                'dashboard', 'consultar_catalogo', 'registrar_entrada', 'registrar_saida',
                'historico_cupons', 'devolucao', 'entregas_pendentes', 'combustiveis',
                'fichas_produtos', 'valor_estoque', 'inventario_geral',
                'funcionarios', 'equipes_campo', 'frotas_veiculos', 'reposicao_automatica',
                'fornecedores', 'suprimentos_kobo', 'seguranca_dados',
                'administracao_usuarios', 'pedido_orcamento',
            ],
        ],
        Setor::ENGENHARIA => [
            User::NIVEL_OPERADOR => [
                'obras_projetos', 'catalogo_materiais_obra', 'rel_abastecimentos',
                'suprimentos_kobo', 'solicitacao_compra', 'pedido_compra',
                'seguranca_epi', 'equipamentos_pesados', 'debitos_manutencao',
            ],
            User::NIVEL_ADMIN => [
                'obras_projetos', 'catalogo_materiais_obra', 'fornecedores',
                'rel_abastecimentos', 'suprimentos_kobo', 'solicitacao_compra',
                'pedido_compra', 'seguranca_epi', 'equipamentos_pesados',
                'debitos_manutencao', 'seguranca_dados',
            ],
        ],
        Setor::MANUTENCAO => [
            User::NIVEL_OPERADOR => [
                'solicitacao_compra', 'pedido_compra', 'pedido_orcamento',
                'seguranca_epi', 'equipamentos_pesados', 'debitos_manutencao',
            ],
            User::NIVEL_ADMIN => [
                'solicitacao_compra', 'pedido_compra', 'pedido_orcamento',
                'seguranca_epi', 'equipamentos_pesados', 'debitos_manutencao',
            ],
        ],
    ];

    /**
     * Aplica o template padrão de módulos a um usuário recém-criado.
     * RF-027.2: "pré-popular a lista de módulos autorizados com um
     * template padrão por nível e setor [...] permitindo edição manual
     * em seguida".
     */
    public function aplicarTemplatePadrao(User $user): void
    {
        $codigoSetor = $user->setor->codigo;
        $chaves = self::TEMPLATE[$codigoSetor][$user->nivel] ?? [];

        $idsModulos = Modulo::whereIn('chave', $chaves)->pluck('id');

        $user->modulos()->sync($idsModulos);
    }

    /**
     * Lista os módulos que PODEM ser selecionados para um setor,
     * independente do nível (RN-002.1) — usado para popular a tela
     * de permissões com checkboxes.
     */
    public function modulosDisponiveisParaSetor(string $codigoSetor)
    {
        return Modulo::all()->filter(
            fn (Modulo $modulo) => $modulo->disponivelParaSetor($codigoSetor)
        )->values();
    }
}
