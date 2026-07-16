<?php

namespace Database\Seeders;

use App\Models\Modulo;
use App\Models\Setor;
use Illuminate\Database\Seeder;

/**
 * Catálogo de módulos do sistema, espelhando a "Matriz de Permissões"
 * do CLAUDE.md. `setores_aplicaveis` define em quais setores o módulo
 * PODE aparecer disponível para seleção (RN-002.1) — não define, por si
 * só, quem tem acesso (isso é feito por usuário, na tabela user_modulo).
 */
class ModuloSeeder extends Seeder
{
    public function run(): void
    {
        $alm = Setor::ALMOXARIFADO;
        $eng = Setor::ENGENHARIA;
        $man = Setor::MANUTENCAO;

        $modulos = [
            // ── Almoxarifado ──────────────────────────────────────────────
            ['chave' => 'dashboard', 'nome' => 'Dashboard Geral', 'setores_aplicaveis' => [$alm]],
            ['chave' => 'consultar_catalogo', 'nome' => 'Consultar Catálogo', 'setores_aplicaveis' => [$alm]],
            ['chave' => 'registrar_entrada', 'nome' => 'Registrar Entrada (NF)', 'setores_aplicaveis' => [$alm]],
            ['chave' => 'registrar_saida', 'nome' => 'Registrar Saída', 'setores_aplicaveis' => [$alm]],
            ['chave' => 'historico_cupons', 'nome' => 'Histórico de Cupons', 'setores_aplicaveis' => [$alm]],
            ['chave' => 'devolucao', 'nome' => 'Devolução', 'setores_aplicaveis' => [$alm]],
            ['chave' => 'entregas_pendentes', 'nome' => 'Entregas Pendentes', 'setores_aplicaveis' => [$alm]],
            ['chave' => 'combustiveis', 'nome' => 'Combustíveis', 'setores_aplicaveis' => [$alm]],
            ['chave' => 'fichas_produtos', 'nome' => 'Fichas de Produtos', 'setores_aplicaveis' => [$alm]],
            ['chave' => 'valor_estoque', 'nome' => 'Valor de Estoque', 'setores_aplicaveis' => [$alm]],
            ['chave' => 'inventario_geral', 'nome' => 'Inventário Geral', 'setores_aplicaveis' => [$alm]],
            ['chave' => 'funcionarios', 'nome' => 'Funcionários', 'setores_aplicaveis' => [$alm]],
            ['chave' => 'equipes_campo', 'nome' => 'Equipes de Campo', 'setores_aplicaveis' => [$alm]],
            ['chave' => 'frotas_veiculos', 'nome' => 'Frotas de Veículos', 'setores_aplicaveis' => [$alm]],
            ['chave' => 'reposicao_automatica', 'nome' => 'Reposição Automática de Estoque', 'setores_aplicaveis' => [$alm]],
            ['chave' => 'administracao_usuarios', 'nome' => 'Administração de Usuários', 'setores_aplicaveis' => [$alm]],

            // ── Engenharia ────────────────────────────────────────────────
            ['chave' => 'obras_projetos', 'nome' => 'Obras/Projetos', 'setores_aplicaveis' => [$eng]],
            ['chave' => 'catalogo_materiais_obra', 'nome' => 'Catálogo de Materiais de Obra', 'setores_aplicaveis' => [$eng]],
            ['chave' => 'rel_abastecimentos', 'nome' => 'Relatórios de Abastecimentos', 'setores_aplicaveis' => [$eng]],

            // ── Compartilhados entre setores ─────────────────────────────
            ['chave' => 'fornecedores', 'nome' => 'Fornecedores', 'setores_aplicaveis' => [$alm, $eng]],
            ['chave' => 'suprimentos_kobo', 'nome' => 'Suprimentos KOBO', 'setores_aplicaveis' => [$alm, $eng]],
            ['chave' => 'solicitacao_compra', 'nome' => 'Solicitação de Compra', 'setores_aplicaveis' => [$eng, $man]],
            ['chave' => 'pedido_compra', 'nome' => 'Pedido de Compra', 'setores_aplicaveis' => [$eng, $man]],
            ['chave' => 'seguranca_epi', 'nome' => 'Segurança & EPI', 'setores_aplicaveis' => [$alm, $eng, $man]],
            ['chave' => 'equipamentos_pesados', 'nome' => 'Equipamentos Pesados', 'setores_aplicaveis' => [$eng, $man]],
            ['chave' => 'debitos_manutencao', 'nome' => 'Débitos de Manutenção', 'setores_aplicaveis' => [$eng, $man]],
            ['chave' => 'seguranca_dados', 'nome' => 'Segurança de Dados / Backup', 'setores_aplicaveis' => [$alm, $eng]],

            // ── Pedido de Orçamento (Manutenção/Engenharia → visível no Almoxarifado) ──
            ['chave' => 'pedido_orcamento', 'nome' => 'Pedido de Orçamento', 'setores_aplicaveis' => [$man, $eng, $alm]],
        ];

        foreach ($modulos as $modulo) {
            Modulo::updateOrCreate(['chave' => $modulo['chave']], $modulo);
        }
    }
}
