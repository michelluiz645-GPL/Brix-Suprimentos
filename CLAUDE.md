# GEPLAN — Sistema de Gestão Operacional
### Regras de Projeto para Desenvolvimento Assistido por IA
### v2 — Versão consolidada para implementação (lógica real do legado incorporada)

---

## 🔐 AÇÃO IMEDIATA OBRIGATÓRIA — antes de qualquer linha de código

O sistema legado (Python/Streamlit) tinha **chave de serviço do Supabase e token do
KoboToolbox gravados em texto puro no código-fonte**. Antes de iniciar a implementação:

1. **Revogue e rotacione imediatamente** a chave de serviço do Supabase usada no legado,
   no painel do projeto Supabase (Settings → API → gerar nova chave).
2. **Revogue e rotacione** o token de API do KoboToolbox usado no legado, na conta KoboToolbox.
3. Nenhuma credencial — nova ou antiga — deve voltar a aparecer literal em código, commit,
   log ou neste documento. Todas vivem em `.env` e são lidas via `config()`/`env()`.

> Este documento **não contém nenhuma chave real**. Onde uma credencial é necessária,
> está descrita apenas pelo **nome da variável de ambiente** esperada.

---

## REGRAS ABSOLUTAS

1. **NUNCA realize commits automáticos.** Sempre pergunte ao usuário antes de executar qualquer `git commit` ou `git push`.
2. **Idioma:** Todo código, comentários, mensagens de erro e textos da interface devem usar **português brasileiro com acentuação correta** (ação, não acao; gestão, não gestao; módulo, não modulo).
3. **Não misture funcionalidades em um único commit.** Cada commit deve representar uma mudança coesa.
4. **Nunca use `php artisan` diretamente** fora do Makefile. Use sempre `make <comando>`.
5. **Nunca exponha credenciais no código-fonte, em commits ou em logs.** Toda credencial vive em `.env`.

---

## Stack Tecnológica

| Camada        | Tecnologia                              |
|---------------|------------------------------------------|
| Backend       | Laravel 11+, PHP 8.4+, MySQL 8           |
| Autenticação  | Laravel Sanctum                          |
| Frontend      | React 19, TypeScript 5+, Vite            |
| Estilo        | Tailwind CSS 4                           |
| Roteamento    | React Router 6                           |
| Infraestrutura| Docker, Docker Compose, Nginx            |

### Variáveis de ambiente obrigatórias (`.env`)

```
KOBOTOOLBOX_API_TOKEN=
KOBOTOOLBOX_UID_SUPRIMENTOS=
KOBOTOOLBOX_UID_COMPRAS=
KOBOTOOLBOX_BASE_URL=https://kf.kobotoolbox.org/api/v2
```

---

## Estrutura de Pastas

```
/
├── backend/                  ← Laravel 11
│   ├── app/Http/Controllers/
│   ├── app/Http/Requests/
│   ├── app/Http/Resources/
│   ├── app/Models/
│   ├── app/Services/
│   ├── database/migrations/
│   ├── database/seeders/
│   └── routes/api.php
├── src/pages/                ← React: páginas
├── src/components/           ← React: componentes reutilizáveis
├── src/services/             ← React: chamadas de API (nunca fetch direto nos componentes)
├── src/hooks/                ← React: hooks customizados
├── src/utils/                ← React: funções utilitárias
├── CLAUDE.md
├── Makefile
├── .env.example
├── App.tsx
├── main.tsx
├── types.ts
├── package.json
└── vite.config.ts
```

---

## Comandos Make

| Comando        | Descrição                                                     |
|----------------|---------------------------------------------------------------|
| `make up`      | Sobe o ambiente de desenvolvimento                            |
| `make up-prod` | Sobe o ambiente de produção                                   |
| `make down`    | Derruba todos os containers                                   |
| `make migrate` | Executa as migrations dentro do container                     |
| `make seed`    | Executa os seeders                                            |
| `make fresh`   | Drop + migrate + seed (ambiente dev)                          |
| `make deploy`  | Pull + deploy completo em produção                            |
| `make send`    | Solicita mensagem de commit, aplica lint, abre PR e faz merge |
| `make db`      | Abre shell do MySQL no container                              |
| `make shell`   | Abre shell bash no container da aplicação                     |

---

## Convenções de Código

### React / TypeScript
- **Apenas componentes funcionais** com hooks
- Props tipadas com `interface` (não `type` para props)
- **Nunca use `fetch` diretamente nos componentes** — use sempre `services/api.ts`
- Formatações centralizadas em `utils/formatters.ts`
- `const inp` e `const lbl` padronizados em todas as páginas para consistência visual

### Laravel
- Controllers apenas orquestram — lógica de negócio nos Services
- Validação via `FormRequest`
- Respostas: `{ "data": {}, "message": "Operação realizada com sucesso." }`
- Erros com mensagem amigável — nunca retornar "Error 500" bruto

---

## Padrões de Interface

### Paleta de Cores
| Token            | Valor     | Uso                           |
|------------------|-----------|-------------------------------|
| `navy-deep`      | `#0F172A` | Fundo da sidebar              |
| `navy-card`      | `#1E293B` | Cards da sidebar, inputs dark |
| `orange-primary` | `#EA6C0A` | Ação primária, destaque       |
| `orange-dark`    | `#C75B12` | Hover de ações primárias      |
| `bg-app`         | `#F8FAFC` | Fundo geral da aplicação      |

### Tipografia
- Interface: `Inter` (sans)
- Valores técnicos (códigos, preços, quantidades): `JetBrains Mono`

### Modais
- ESC e clique fora fecham o modal
- Animação suave de entrada/saída

### Toasts
- Sucesso: emerald | Erro: rose | Aviso: amber
- Duração: 4 segundos | Posição: canto inferior direito

### Erros
- Nunca exibir mensagens técnicas ao usuário
- Erros de validação: campo a campo abaixo dos inputs
- **Resiliência de formulário:** campos preenchidos nunca são limpos em caso de erro

---

## Banco de Dados

- Toda tabela: `id`, `timestamps()`, `softDeletes()`
- Relacionamentos com `foreignId()->constrained()->onDelete('cascade')`
- Seeders usam `updateOrCreate()`
- Usuário admin padrão: `admin@admin.com` / `123456`
- Datas e horários: colunas `date`/`datetime` nativas — nunca string livre
- Valores monetários: `decimal(12,2)`, nunca `float`

---

## Segurança

- Autenticação via Laravel Sanctum (tokens de API por usuário)
- CORS configurado apenas para origens autorizadas
- Middleware de setor aplicado nas rotas protegidas
- Credenciais de serviços externos exclusivamente via `.env`

---

## Requisitos Funcionais — GEPLAN

### RF-001 — Landing Page
Página inicial pública. Navegação com "Acessar o Sistema", seção hero, três pilares (Terraplanagem, Obras, Conservação), rodapé. Redireciona para painel se autenticado.

---

### RF-002 — Autenticação e Controle de Acesso
Login com seleção de setor (Almoxarifado/Engenharia/Manutenção), e-mail e senha. Token Sanctum. Sessão persistente. Cada usuário possui lista individual de módulos autorizados — o setor define o conjunto disponível; o Admin customiza individualmente.

---

### RF-003 — Dashboard Geral (Almoxarifado)
KPIs: total de produtos, colaboradores ativos, valor do estoque, itens críticos, pedidos pendentes. Ações rápidas. Tabela de movimentações recentes com filtro por tipo. Alerta de itens críticos com link para Reposição Automática (RF-029).

---

### RF-004 — Consultar Catálogo
Busca por texto livre (código, nome, categoria). Filtro por categoria. Tabela com indicador de estoque crítico. Modal com ficha completa. Botão de atalho para Entrada ou Saída.

---

### RF-005 — Registrar Entrada (NF)
Cabeçalho: NF, data, fornecedor, almoxarifado, responsável. Múltiplos itens com quantidade e valor unitário obrigatório. Subtotal em tempo real. Confirmação atualiza estoque e preço do produto. Número de pedido automático.

---

### RF-006 — Registrar Saída (Slip/Cupom)
Cabeçalho: tipo (Retirada/Entrega), equipe, colaborador, responsável almoxarifado. Múltiplos itens com destino individual (Para a Equipe, Roçada, Obra, Administração, Manutenção, Consumível, Frota, Outros). EPI exige colaborador específico e calcula data de vencimento automaticamente. Tipo Entrega gera Entrega Pendente (RF-009). Nota de Débito gerada automaticamente quando aplicável (RF-025).

---

### RF-007 — Histórico de Cupons
Listagem de cupons emitidos com filtros. Modal de detalhe. Reimpressão. Cancelamento com estorno de estoque (Admin).

---

### RF-008 — Devolução
Vinculada obrigatoriamente a pedido de saída anterior. Seleção parcial ou total dos itens. Motivo obrigatório. Opção de marcar item como danificado (não retorna ao estoque).

---

### RF-009 — Entregas Pendentes
Listagem de entregas com status PENDENTE. Confirmação registra confirmante e timestamp. Indicador de atraso. Criada apenas para saídas do tipo "Entrega".

---

### RF-010 — Combustíveis
**Tipos disponíveis:** DIESEL S500, DIESEL S10, GASOLINA

**Entrada:** fornecedor, quantidade (litros), valor por litro, responsável, data. Calcula valor total automaticamente.

**Saída:** tipo de combustível, quantidade, destino (Frota com placa obrigatória OU Outros com campo livre), responsável, data.

KPI cards com saldo atual por tipo. Histórico com filtro por tipo (entrada/saída) e combustível.

**Regras:** não abastecer além do saldo disponível. Destino Frota exige placa; Outros exige descrição.

---

### RF-011 — Fichas de Produtos
Cadastro completo: código interno (único), nome, categoria, unidade, preço, estoque mínimo/máximo, localização, dias de validade EPI. Soft delete. Histórico de movimentações. Apenas Admin pode criar/editar/inativar.

**Categorias (28):** Filtros, Óleos, Graxas, Lubrificantes, Combustível, Peças Motor, Peças Hidráulicas, Elétrica, Iluminação, Freios, Suspensão, Rolamentos, Correias, Mangueiras, Parafusos, Ferramentas, EPI, Material de Limpeza, Solda, Pneus, Baterias, Tintas, Material de Escritório, Informática, Outros, Peça Leve, Peça Pesada, Roçada, Consumo Adm

---

### RF-012 — Valor de Estoque (Inventário Financeiro)
Listagem com valor por item (quantidade × preço). Subtotais por categoria. Total geral destacado. Exportação CSV. Apenas Admin.

---

### RF-013 — Inventário Geral
Sessão de contagem: data, responsável, almoxarifado. Inserir quantidade física por produto. Diferença automática. Ajuste com justificativa gera movimentação tipo AJUSTE. Apenas Admin finaliza.

---

### RF-014 — Funcionários
Cadastro: nome, função, CPF (único), telefone, equipe, status. Demissão com flag `demitido`. Filtros. EPIs vinculados com validade.

---

### RF-015 — Equipes de Campo
Cadastro: nome, número, responsável, veículo, **tipo de operação** (Manutenção, Conservação, Terraplanagem, Roçada, Outro — obrigatório). Vínculo de colaboradores. Equipes tipo "Manutenção" disparam Nota de Débito automática em saídas.

---

### RF-016 — Frotas de Veículos
Cadastro: placa (única), modelo, tipo, ano, equipe, status. Registro de manutenção. Veículos inativos não aparecem em seleções de abastecimento.

---

### RF-017 — Obras & Projetos (Engenharia)
Cadastro: nome, tipo (pública/privada), responsável, datas, centro de custo, status. Vínculo de SCs. Histórico de materiais. Obras concluídas não aceitam novas SCs.

---

### RF-018 — Fornecedores
Cadastro: razão social, CNPJ (único), telefone, e-mail, contato, cidade, estado. Inativação. Histórico de pedidos. Engenharia Admin pode editar; Almoxarifado somente consulta.

---

### RF-019 — Relatórios de Abastecimentos (Engenharia)
Filtros por período, equipe, obra e tipo de combustível. Tabela com KM/horímetro. Totais por equipe/obra. Exportação CSV.

---

### RF-020 — Suprimentos KOBO
Busca pedidos pendentes do KoboToolbox via API (credenciais em `.env`). Aprovação total ou parcial (item a item). Converte em Solicitação de Compra. Estados: PENDENTE, APROVADO, PARCIAL, REJEITADO.

---

### RF-021 — Solicitação de Compra
**Setores:** ENGENHARIA e MANUTENÇÃO

Formulário interno antes do Pedido de Compra formal. Campos: data necessária, solicitante, setor, destino (Frota/Equipamento para Manutenção; Obra/CC para Engenharia), urgência (Baixa/Média/Alta/Crítica), local de entrega. Múltiplos itens com nome, quantidade, unidade, fabricante, part number, aplicação e data. Status: PENDENTE → APROVADA → PENDENTE CHEGADA → CONCLUÍDA (ou REJEITADA/CANCELADA). PDF imprimível.

---

### RF-022 — Pedido de Compra
**Setores:** ENGENHARIA e MANUTENÇÃO

Vinculado a uma SC de origem. Fornecedor do cadastro ou manual. Múltiplos itens com preço, desconto e data de entrega por item. Total automático (itens + frete + outras despesas − descontos). Status: PENDENTE → APROVADO → CONCLUÍDO (ou CANCELADO). PDF imprimível. Somente Admin aprova/cancela.

---

### RF-023 — Segurança & EPI
**Setores:** ALMOXARIFADO, ENGENHARIA, MANUTENÇÃO

Registro de entrega de EPI por colaborador. Situação: válido / próximo ao vencimento (≤ 30 dias, âmbar) / vencido (vermelho). Saída de item EPI (RF-006) exige colaborador específico por item e gera registro aqui automaticamente — a validade conta a partir da data da saída, somando os dias cadastrados na ficha do produto (RF-011).

---

### RF-024 — Equipamentos Pesados
Cadastro com tipo, série, equipe e status. Registro de movimentações (manutenção/deslocamento/retorno). Histórico completo por equipamento.

---

### RF-025 — Débitos de Manutenção
Geração automática a partir de saídas com destino de frota, destino "Manutenção" ou equipe do tipo manutenção. Itens EPI excluídos obrigatoriamente. Status ABERTO → PAGO. KPIs de total aberto/pago. Somente Admin marca como pago.

---

### RF-026 — Segurança de Dados
Status da conexão com banco. Backup manual (download). Status da integração KoboToolbox sem exibir token. Log de sincronizações. Nenhuma credencial exibida em texto puro. Somente Admin.

---

### RF-027 — Administração de Usuários
CRUD de usuários com nível (Admin/Operador), setor e lista individual de módulos autorizados. Template padrão por nível na criação, customizável depois. Redefinição de senha. Log de atividades. Somente Admin.

---

### RF-028 — Catálogo de Materiais de Obra
**Setor:** ENGENHARIA

Cadastro de materiais/serviços de obra: código (único), nome, categoria, unidade, especificação técnica. Importação em lote via texto colado (`CÓDIGO | NOME | CATEGORIA | UNIDADE | ESPECIFICAÇÃO`). Autocomplete em Solicitação/Pedido de Compra.

**Categorias (18):** Concreto, Alvenaria, Estrutura Metálica, Impermeabilização, Cobertura, Revestimento, Esquadrias, Hidráulico, Elétrico, Fundação, Terraplanagem, Pavimentação, Sinalização, EPI/Segurança, Ferramentas, Locação de Equipamento, Serviço/Mão de Obra, Outros

---

### RF-029 — Reposição Automática de Estoque
**Setor:** ALMOXARIFADO

Para cada produto crítico, botão "Gerar Pedido de Reposição". Quantidade sugerida: atingir estoque máximo (se cadastrado) ou dobro do mínimo menos estoque atual. Sugere preço e fornecedor da última compra. Data de entrega obrigatória. Bloqueia se já houver pedido em aberto para o produto. Pedido entra no RF-022 marcado como "Automático".

---

## Matriz de Permissões

| Módulo                        | ALMOX Op | ALMOX Admin | ENG Op | ENG Admin | MANUT Op | MANUT Admin |
|-------------------------------|:--------:|:-----------:|:------:|:---------:|:--------:|:-----------:|
| Landing Page                  | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Login                         | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dashboard Geral               | ✅ | ✅ | — | — | — | — |
| Consultar Catálogo            | ✅ | ✅ | — | — | — | — |
| Registrar Entrada             | ✅ | ✅ | — | — | — | — |
| Registrar Saída               | ✅ | ✅ | — | — | — | — |
| Histórico de Cupons           | ✅ | ✅ | — | — | — | — |
| Devolução                     | ✅ | ✅ | — | — | — | — |
| Entregas Pendentes            | ✅ | ✅ | — | — | — | — |
| Combustíveis                  | ✅ | ✅ | — | — | — | — |
| Fichas de Produtos            | 👁️ | ✅ | — | — | — | — |
| Valor de Estoque              | — | ✅ | — | — | — | — |
| Inventário Geral              | — | ✅ | — | — | — | — |
| Funcionários                  | ✅ | ✅ | — | — | — | — |
| Equipes de Campo              | ✅ | ✅ | — | — | — | — |
| Frotas de Veículos            | ✅ | ✅ | — | — | — | — |
| Reposição Automática          | ✅ | ✅ | — | — | — | — |
| Obras/Projetos                | — | — | ✅ | ✅ | — | — |
| Catálogo de Materiais de Obra | — | — | ✅ | ✅ | — | — |
| Fornecedores                  | 👁️ | 👁️ | — | ✅ | — | — |
| Rel. Abastecimentos           | — | — | ✅ | ✅ | — | — |
| Suprimentos KOBO              | — | ✅ | ✅ | ✅ | — | — |
| Solicitação de Compra         | — | — | ✅ | ✅ | ✅ | ✅ |
| Pedido de Compra              | — | — | ✅ | ✅ | ✅ | ✅ |
| Segurança & EPI               | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Equipamentos Pesados          | — | — | ✅ | ✅ | ✅ | ✅ |
| Débitos de Manutenção         | — | — | ✅ | ✅ | ✅ | ✅ |
| Segurança de Dados            | — | ✅ | — | ✅ | — | — |
| Administração de Usuários     | — | ✅ | — | — | — | — |

> ✅ = Acesso total | 👁️ = Somente leitura | — = Sem acesso

---

## Glossário

| Termo           | Definição                                                                      |
|-----------------|--------------------------------------------------------------------------------|
| Almoxarifado    | Setor responsável pelo estoque e movimentação de materiais                     |
| SC              | Solicitação de Compra — documento interno de requisição de materiais           |
| PC              | Pedido de Compra — documento formal enviado ao fornecedor                      |
| NF              | Nota Fiscal — documento fiscal que acompanha a entrada de materiais            |
| Slip / Cupom    | Documento de saída de materiais emitido pelo almoxarife                        |
| EPI             | Equipamento de Proteção Individual                                             |
| Nota de Débito  | Documento gerado automaticamente cobrando da Manutenção o consumo de materiais |
| Soft Delete     | Exclusão lógica — o registro é inativado mas não removido do banco             |
| Centro de Custo | Código que identifica a obra ou projeto para fins de rateio de custos          |
| KoboToolbox     | Plataforma externa de coleta de dados via formulários (integração)             |
| GEPLAN          | Sistema de Gestão Operacional para empresas de terraplanagem e obras           |
