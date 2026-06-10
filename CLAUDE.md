# GEPLAN — Sistema de Gestão Operacional
### Regras de Projeto para Desenvolvimento Assistido por IA

---

## REGRAS ABSOLUTAS

1. **NUNCA realize commits automáticos.** Sempre pergunte ao usuário antes de executar qualquer `git commit` ou `git push`.
2. **Idioma:** Todo código, comentários, mensagens de erro e textos da interface devem usar **português brasileiro com acentuação correta** (ação, não acao; gestão, não gestao; módulo, não modulo).
3. **Não misture funcionalidades em um único commit.** Cada commit deve representar uma mudança coesa.
4. **Nunca use `php artisan` diretamente** fora do Makefile. Use sempre `make <comando>`.
5. **Nunca exponha credenciais** no código-fonte. Use variáveis de ambiente via `.env`.

---

## Stack Tecnológica

| Camada        | Tecnologia                              |
|---------------|-----------------------------------------|
| Backend       | Laravel 11+, PHP 8.4+, MySQL 8          |
| Autenticação  | Laravel Sanctum                         |
| Frontend      | React 19, TypeScript 5+, Vite           |
| Estilo        | Tailwind CSS 4                          |
| Roteamento    | React Router 6                          |
| Infraestrutura| Docker, Docker Compose, Nginx           |

---

## Estrutura de Pastas

```
/
├── backend/                  ← Laravel 11
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   ├── Requests/
│   │   │   └── Resources/
│   │   ├── Models/
│   │   └── Services/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   └── routes/api.php
├── pages/                    ← React: páginas
├── components/               ← React: componentes reutilizáveis
├── services/                 ← React: chamadas de API (nunca fetch direto nos componentes)
├── hooks/                    ← React: hooks customizados
├── utils/                    ← React: funções utilitárias
├── docker/
│   ├── nginx/
│   │   ├── default.conf
│   │   └── production.conf
│   ├── Dockerfile
│   └── Dockerfile.prod
├── CLAUDE.md
├── README.md
├── Makefile
├── docker-compose.yml
├── docker-compose.prod.yml
├── .gitignore
├── index.html
├── index.css
├── App.tsx
├── main.tsx
├── types.ts
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Comandos Make

| Comando          | Descrição                                                     |
|------------------|---------------------------------------------------------------|
| `make up`        | Sobe o ambiente de desenvolvimento (self-heal)                |
| `make up-prod`   | Sobe o ambiente de produção                                   |
| `make down`      | Derruba todos os containers                                   |
| `make migrate`   | Executa as migrations dentro do container                     |
| `make seed`      | Executa os seeders                                            |
| `make fresh`     | Drop + migrate + seed (ambiente dev)                          |
| `make deploy`    | Pull + deploy completo em produção                            |
| `make send`      | Solicita mensagem de commit, aplica lint, abre PR e faz merge |
| `make db`        | Abre shell do MySQL no container                              |
| `make thinker`   | Abre tinker do Laravel                                        |
| `make shell`     | Abre shell bash no container da aplicação                     |

---

## Convenções de Código

### React / TypeScript
- **Apenas componentes funcionais** com hooks
- Props tipadas com `interface` (não `type` para props)
- **Nunca use `fetch` diretamente nos componentes** — use sempre funções de `services/api.ts`
- Serviços de API isolados em `services/`
- Estado global via Context API ou hooks customizados em `hooks/`
- Formatações (moeda, data, CPF) centralizadas em `utils/formatters.ts`

### Laravel
- Controllers **apenas orquestram** — lógica de negócio nos Services (`app/Services/`)
- Validação via `FormRequest` (nunca validar diretamente no controller)
- Respostas sempre via `ApiResource` ou `response()->json()` com estrutura consistente:
  ```json
  { "data": {}, "message": "Operação realizada com sucesso." }
  ```
- Erros com mensagem clara ao usuário — nunca retornar "Error 500" ou mensagem técnica bruta

---

## Padrões de Interface

### Paleta de Cores
| Token             | Valor       | Uso                          |
|-------------------|-------------|------------------------------|
| `navy-deep`       | `#0F172A`   | Fundo da sidebar             |
| `navy-card`       | `#1E293B`   | Cards da sidebar, inputs dark |
| `orange-primary`  | `#EA6C0A`   | Ação primária, destaque       |
| `orange-dark`     | `#C75B12`   | Hover de ações primárias      |
| `bg-app`          | `#F8FAFC`   | Fundo geral da aplicação      |

### Tipografia
- Interface: `Inter` (sans)
- Valores técnicos (códigos, preços, quantidades): `JetBrains Mono`

### Modais
- **ESC** fecha o modal
- **Clique fora** (backdrop) fecha o modal
- Animação suave de entrada/saída
- Título + conteúdo + botões de ação (cancelar / confirmar)

### Toasts
- Sucesso: verde (emerald)
- Erro: vermelho (rose)
- Aviso: âmbar (amber)
- Duração padrão: 4 segundos
- Posicionamento: canto inferior direito

### Erros
- Nunca exibir mensagens técnicas para o usuário (ex: "SQLSTATE[23000]...")
- Sempre exibir mensagem amigável: "Não foi possível salvar. Tente novamente."
- Erros de validação: exibir campo a campo abaixo dos inputs

---

## Banco de Dados

- Toda tabela deve incluir: `id`, `timestamps()`, `softDeletes()`
- Relacionamentos com `foreignId()->constrained()->onDelete('cascade')`
- Seeders usam `updateOrCreate()` — nunca inserts estáticos
- Usuário admin padrão: `admin@admin.com` / `123456`

---

## Segurança

- Autenticação via Laravel Sanctum (tokens de API por usuário)
- CORS configurado apenas para origens autorizadas
- Middleware de setor aplicado nas rotas protegidas
- Nunca retornar dados sensíveis em respostas de erro

---

## Requisitos Funcionais — GEPLAN

### RF-001 — Landing Page

**Setor/Perfil com acesso:** Público (sem autenticação)
**Descrição:** Página inicial pública do sistema GEPLAN. Apresenta a plataforma, seus pilares de serviço e permite o acesso ao login corporativo.

**Funcionalidades:**
- [RF-001.1] Exibir navegação superior com logotipo GEPLAN e botão "Acessar o Sistema" que redireciona para a tela de login
- [RF-001.2] Exibir seção hero com identidade visual da plataforma, slogan e chamada para ação
- [RF-001.3] Exibir seção de serviços com os três pilares: Terraplanagem, Obras Públicas e Privadas, e Conservação e Manutenção
- [RF-001.4] Exibir rodapé com informações institucionais, ano atual e nome da plataforma
- [RF-001.5] Redirecionar automaticamente para o painel caso o usuário já esteja autenticado

**Regras de Negócio:**
- [RN-001.1] A landing page deve ser acessível sem autenticação
- [RN-001.2] O botão "Acessar o Sistema" deve estar visível mesmo em dispositivos móveis
- [RN-001.3] Usuário autenticado não deve ver a landing page — deve ser redirecionado ao painel

---

### RF-002 — Autenticação e Controle de Acesso

**Setor/Perfil com acesso:** Todos os usuários
**Descrição:** Módulo de autenticação com seleção de setor e controle de acesso por nível. Define o contexto de atuação do usuário no sistema.

**Funcionalidades:**
- [RF-002.1] Exibir tela de login com campos: seleção de setor (Almoxarifado / Engenharia / Manutenção), usuário e senha
- [RF-002.2] Autenticar o usuário via API e armazenar token de sessão seguro
- [RF-002.3] Redirecionar automaticamente para o painel do setor correspondente após login bem-sucedido
- [RF-002.4] Exibir mensagem de erro clara em caso de credenciais inválidas (ex.: "Usuário ou senha incorretos")
- [RF-002.5] Manter sessão ativa entre recarregamentos de página
- [RF-002.6] Encerrar sessão ao clicar em "Sair do Sistema", limpando token e redirecionando para o login

**Regras de Negócio:**
- [RN-002.1] O setor selecionado no login determina os módulos visíveis ao usuário
- [RN-002.2] Níveis de acesso: ADMIN (acesso total) e OPERADOR (acesso restrito ao setor)
- [RN-002.3] Rotas protegidas devem redirecionar para o login caso o usuário não esteja autenticado
- [RN-002.4] O token de autenticação deve ser renovado automaticamente em caso de expiração
- [RN-002.5] Tentativas de acesso a módulos não autorizados devem exibir mensagem "Acesso não permitido"

---

### RF-003 — Dashboard Geral (Almoxarifado)

**Setor/Perfil com acesso:** ALMOXARIFADO (Admin e Operador)
**Descrição:** Painel central de visão gerencial do Almoxarifado. Exibe KPIs de estoque, alertas de reposição, ações rápidas e histórico de movimentações recentes.

**Funcionalidades:**
- [RF-003.1] Exibir card de status da conexão com banco de dados (conectado / desconectado) com link para configurações
- [RF-003.2] Exibir alerta visual destacado quando existirem produtos com estoque igual ou abaixo do estoque mínimo de segurança
- [RF-003.3] Exibir KPIs: total de produtos no catálogo, colaboradores ativos, valor total do estoque (R$), itens críticos e pedidos de compra pendentes
- [RF-003.4] Exibir painel de ações rápidas com botões para: Consultar, Entrada NF, Saída Slip, Devolução e Combustível
- [RF-003.5] Exibir tabela das últimas movimentações com filtro por tipo (Todos / Entrada / Saída / Devolução) e seleção de quantidade de linhas (10/20/50/100)
- [RF-003.6] Cada linha da tabela de movimentos deve exibir: número do pedido, nota fiscal, data, tipo, produto, quantidade, preço unitário, destinatário e responsável

**Regras de Negócio:**
- [RN-003.1] Itens críticos = produtos com estoque atual ≤ estoque mínimo e estoque mínimo > 0
- [RN-003.2] Valor do estoque = soma de (preço unitário × quantidade em estoque) de todos os produtos
- [RN-003.3] Movimentações exibidas em ordem decrescente de data
- [RN-003.4] O alerta de itens críticos deve indicar o caminho para gerar pedidos de reposição

---

### RF-004 — Consultar Catálogo

**Setor/Perfil com acesso:** ALMOXARIFADO (Admin e Operador)
**Descrição:** Módulo de busca e consulta de produtos no catálogo do almoxarifado. Permite localizar itens por código, nome ou categoria com visualização detalhada.

**Funcionalidades:**
- [RF-004.1] Campo de busca por texto livre (pesquisa em código do produto, nome e categoria)
- [RF-004.2] Filtro por categoria de produto
- [RF-004.3] Exibir resultados em tabela com: código, nome, categoria, unidade, preço unitário, estoque atual, estoque mínimo e localização (armário/prateleira)
- [RF-004.4] Indicar visualmente produtos com estoque crítico (abaixo do mínimo) na listagem
- [RF-004.5] Clicar em um produto abre modal com ficha completa do produto
- [RF-004.6] Botão para ir diretamente a Entrada ou Saída a partir do resultado da busca

**Regras de Negócio:**
- [RN-004.1] A busca deve ser insensível a maiúsculas/minúsculas e acentuação
- [RN-004.2] Produtos inativos não devem aparecer nos resultados de busca padrão (exibir apenas com filtro específico)
- [RN-004.3] Resultados devem ser paginados (máximo 50 por página)

---

### RF-005 — Registrar Entrada (NF)

**Setor/Perfil com acesso:** ALMOXARIFADO (Admin e Operador)
**Descrição:** Registro de recebimento de materiais via nota fiscal. Atualiza o estoque e registra a movimentação de entrada com todos os dados do fornecedor e NF.

**Funcionalidades:**
- [RF-005.1] Formulário com campos: número da NF, data de recebimento, fornecedor, almoxarifado destino e responsável
- [RF-005.2] Adicionar múltiplos itens à entrada: busca por código/nome, quantidade, preço unitário e unidade
- [RF-005.3] Calcular e exibir subtotal por item e total geral da NF em tempo real
- [RF-005.4] Confirmar a entrada registra os itens, atualiza o estoque de cada produto e cria a movimentação
- [RF-005.5] Gerar número de pedido automático sequencial para rastreabilidade
- [RF-005.6] Exibir confirmação de sucesso com número do pedido gerado após registro

**Regras de Negócio:**
- [RN-005.1] Não é permitido registrar entrada com quantidade zero ou negativa
- [RN-005.2] O estoque do produto deve ser incrementado pela quantidade informada após confirmação
- [RN-005.3] O número da NF pode ser reutilizado em entradas diferentes (um fornecedor pode enviar múltiplas NFs)
- [RN-005.4] A entrada deve ser associada ao usuário logado como responsável

---

### RF-006 — Registrar Saída (Slip/Cupom)

**Setor/Perfil com acesso:** ALMOXARIFADO (Admin e Operador)
**Descrição:** Registro de retirada de materiais do estoque com geração de cupom/slip de saída. Associa a saída a uma equipe, colaborador ou frota.

**Funcionalidades:**
- [RF-006.1] Formulário com campos: destinatário (equipe de campo / colaborador / frota), almoxarifado origem e responsável
- [RF-006.2] Adicionar múltiplos itens à saída: busca por código/nome, quantidade e unidade
- [RF-006.3] Exibir saldo disponível em estoque de cada item adicionado em tempo real
- [RF-006.4] Campo opcional de observações por item (ex.: destino específico, n° de OS)
- [RF-006.5] Confirmar saída registra a movimentação, debita o estoque e cria o slip de saída no histórico
- [RF-006.6] Gerar número de pedido automático e cupom digital (PDF ou visualização imprimível)

**Regras de Negócio:**
- [RN-006.1] Não é permitido registrar saída com quantidade maior que o estoque disponível — exibir alerta claro
- [RN-006.2] O estoque do produto deve ser decrementado após confirmação
- [RN-006.3] A saída gera automaticamente um registro de Entrega Pendente para confirmação de recebimento em campo
- [RN-006.4] Saídas de EPIs devem informar o colaborador destinatário e a data prevista de validade/troca

---

### RF-007 — Histórico de Cupons

**Setor/Perfil com acesso:** ALMOXARIFADO (Admin e Operador)
**Descrição:** Listagem e consulta de todos os slips/cupons de saída já emitidos, com possibilidade de reimpressão e rastreamento.

**Funcionalidades:**
- [RF-007.1] Listar todos os cupons de saída com: número do pedido, data, equipe/colaborador, total de itens e valor total
- [RF-007.2] Filtrar por data (período), equipe, tipo de destinatário e almoxarifado
- [RF-007.3] Clicar em um cupom abre modal com detalhe completo de todos os itens do pedido
- [RF-007.4] Botão para reimprimir/exibir o cupom original em formato printável

**Regras de Negócio:**
- [RN-007.1] Cupons não podem ser editados após emissão — apenas cancelados pelo Admin com justificativa
- [RN-007.2] Cancelamento de cupom estorna os itens ao estoque

---

### RF-008 — Devolução

**Setor/Perfil com acesso:** ALMOXARIFADO (Admin e Operador)
**Descrição:** Registro de retorno de materiais ao estoque, vinculado a um slip de saída anterior.

**Funcionalidades:**
- [RF-008.1] Buscar o pedido de saída original por número de pedido ou equipe
- [RF-008.2] Selecionar os itens e quantidades a devolver (parcial ou total)
- [RF-008.3] Campo de observação obrigatório descrevendo o motivo da devolução
- [RF-008.4] Confirmar devolução incrementa o estoque dos itens devolvidos e registra a movimentação como DEVOLUÇÃO

**Regras de Negócio:**
- [RN-008.1] A quantidade devolvida não pode ser superior à quantidade originalmente retirada
- [RN-008.2] Devoluções parciais são permitidas
- [RN-008.3] Itens danificados devem ser marcados como tal e não retornam ao estoque disponível

---

### RF-009 — Entregas Pendentes

**Setor/Perfil com acesso:** ALMOXARIFADO (Admin e Operador)
**Descrição:** Painel de controle de entregas aguardando confirmação de recebimento pela equipe de campo.

**Funcionalidades:**
- [RF-009.1] Listar todas as entregas com status PENDENTE com: número do pedido, data, equipe, entregador e itens
- [RF-009.2] Confirmar entrega marca o pedido como ENTREGUE e registra data e responsável pela confirmação
- [RF-009.3] Filtrar por equipe, data e almoxarifado
- [RF-009.4] Exibir indicador visual de entregas com atraso (pendentes há mais de X dias)

**Regras de Negócio:**
- [RN-009.1] Só é possível confirmar entrega para pedidos com status PENDENTE
- [RN-009.2] A confirmação deve registrar o nome do confirmante e o timestamp

---

### RF-010 — Combustíveis

**Setor/Perfil com acesso:** ALMOXARIFADO (Admin e Operador)
**Descrição:** Controle de estoque e abastecimento de combustíveis (diesel, gasolina, etc.) para veículos da frota.

**Funcionalidades:**
- [RF-010.1] Registrar entrada de combustível com: tipo, quantidade (litros), valor, fornecedor, data e responsável
- [RF-010.2] Registrar abastecimento de veículo com: placa/identificação, tipo de combustível, litros, km/horômetro, data e responsável
- [RF-010.3] Exibir saldo atual por tipo de combustível em KPI cards
- [RF-010.4] Listar histórico de movimentações com filtro por tipo (entrada / abastecimento) e período
- [RF-010.5] Exibir relatório de consumo por equipe ou frota

**Regras de Negócio:**
- [RN-010.1] Não é permitido abastecer mais que o saldo disponível em estoque
- [RN-010.2] O horômetro/km deve ser maior que o último registro para o mesmo veículo

---

### RF-011 — Fichas de Produtos

**Setor/Perfil com acesso:** ALMOXARIFADO (Admin); OPERADOR (somente visualização)
**Descrição:** Cadastro completo e manutenção das fichas de produtos do catálogo, incluindo parâmetros de estoque, localização e dados técnicos.

**Funcionalidades:**
- [RF-011.1] Cadastrar novo produto com: código interno, nome, categoria, unidade de medida, preço unitário, estoque mínimo, estoque máximo, localização (armário/prateleira) e dias de validade EPI (se aplicável)
- [RF-011.2] Editar qualquer campo da ficha de produto existente
- [RF-011.3] Inativar produto (não exclui — aplica soft delete)
- [RF-011.4] Listar produtos com filtros por categoria, status e faixa de estoque
- [RF-011.5] Exibir histórico de movimentações na ficha do produto

**Regras de Negócio:**
- [RN-011.1] O código interno do produto deve ser único no catálogo
- [RN-011.2] Apenas Admin pode cadastrar, editar ou inativar produtos
- [RN-011.3] Produtos com movimentações vinculadas não podem ser excluídos fisicamente

---

### RF-012 — Valor de Estoque (Inventário Financeiro)

**Setor/Perfil com acesso:** ALMOXARIFADO (Admin)
**Descrição:** Visão financeira completa do estoque, calculando o valor monetário de todos os produtos em estoque.

**Funcionalidades:**
- [RF-012.1] Listar todos os produtos com: código, nome, categoria, quantidade em estoque, preço unitário e valor total por item
- [RF-012.2] Agrupar e subtotalizar por categoria
- [RF-012.3] Exibir valor total geral do estoque em destaque
- [RF-012.4] Exportar relatório em formato CSV ou PDF

**Regras de Negócio:**
- [RN-012.1] Valor por item = quantidade atual em estoque × preço unitário cadastrado
- [RN-012.2] Somente Admin tem acesso ao valor financeiro do estoque

---

### RF-013 — Inventário Geral

**Setor/Perfil com acesso:** ALMOXARIFADO (Admin)
**Descrição:** Módulo de contagem física do estoque para conciliação entre o saldo no sistema e o saldo real em prateleira.

**Funcionalidades:**
- [RF-013.1] Iniciar sessão de inventário registrando data, responsável e almoxarifado
- [RF-013.2] Para cada produto, inserir a quantidade contada fisicamente
- [RF-013.3] O sistema exibe automaticamente a diferença (sobra ou falta) entre o estoque no sistema e a contagem física
- [RF-013.4] Opção de ajustar o estoque no sistema para igualar à contagem física (com justificativa obrigatória)
- [RF-013.5] Gerar relatório de inventário com divergências destacadas

**Regras de Negócio:**
- [RN-013.1] O ajuste de inventário gera uma movimentação de tipo AJUSTE no histórico
- [RN-013.2] Apenas Admin pode aprovar e finalizar ajustes de inventário

---

### RF-014 — Funcionários

**Setor/Perfil com acesso:** ALMOXARIFADO (Admin e Operador)
**Descrição:** Cadastro e gestão de colaboradores da empresa, vinculados às equipes de campo.

**Funcionalidades:**
- [RF-014.1] Cadastrar colaborador com: nome completo, função, CPF, telefone, equipe e status
- [RF-014.2] Editar dados do colaborador
- [RF-014.3] Registrar demissão/desligamento (marca como inativo — soft delete)
- [RF-014.4] Listar colaboradores com filtro por equipe, função e status (ativo/inativo)
- [RF-014.5] Visualizar EPIs vinculados ao colaborador com datas de validade

**Regras de Negócio:**
- [RN-014.1] CPF deve ser único no cadastro
- [RN-014.2] Colaboradores desligados ficam visíveis no histórico mas não aparecem nas listagens ativas

---

### RF-015 — Equipes de Campo

**Setor/Perfil com acesso:** ALMOXARIFADO (Admin e Operador)
**Descrição:** Gestão das equipes de campo, incluindo composição de membros e veículo associado.

**Funcionalidades:**
- [RF-015.1] Cadastrar equipe com: nome, número da equipe, responsável e veículo associado
- [RF-015.2] Vincular e desvincular colaboradores à equipe
- [RF-015.3] Listar equipes com membros e veículo

**Regras de Negócio:**
- [RN-015.1] Um colaborador pode pertencer a apenas uma equipe ativa por vez
- [RN-015.2] Uma equipe pode ter múltiplos colaboradores

---

### RF-016 — Frotas de Veículos

**Setor/Perfil com acesso:** ALMOXARIFADO (Admin e Operador)
**Descrição:** Cadastro e controle da frota de veículos da empresa.

**Funcionalidades:**
- [RF-016.1] Cadastrar veículo com: placa, modelo, tipo, ano, equipe associada e status
- [RF-016.2] Editar dados do veículo
- [RF-016.3] Registrar manutenção realizada (data, tipo, descrição e custo)
- [RF-016.4] Listar veículos com filtros por tipo, equipe e status

**Regras de Negócio:**
- [RN-016.1] Placa do veículo deve ser única no cadastro
- [RN-016.2] Veículos inativos não aparecem nas seleções de abastecimento

---

### RF-017 — Obras Públicas e Privadas (Engenharia)

**Setor/Perfil com acesso:** ENGENHARIA (Admin e Operador)
**Descrição:** Gestão das obras ativas e concluídas, com controle de insumos, centros de custo e solicitações de compra vinculadas.

**Funcionalidades:**
- [RF-017.1] Cadastrar obra com: nome, tipo (pública/privada), responsável, data de início, data prevista de conclusão, centro de custo e status
- [RF-017.2] Editar dados da obra e atualizar status (Ativa / Concluída / Suspensa)
- [RF-017.3] Vincular Solicitações de Compra (SC) à obra
- [RF-017.4] Visualizar histórico de materiais e pedidos associados à obra
- [RF-017.5] Listar obras com filtros por status, tipo e período

**Regras de Negócio:**
- [RN-017.1] Obras concluídas não aceitam novas SCs vinculadas
- [RN-017.2] Centro de custo deve ser informado para viabilizar relatórios gerenciais

---

### RF-018 — Fornecedores

**Setor/Perfil com acesso:** ENGENHARIA (Admin); ALMOXARIFADO (somente consulta)
**Descrição:** Cadastro e gestão de fornecedores para vinculação a pedidos de compra e entradas de NF.

**Funcionalidades:**
- [RF-018.1] Cadastrar fornecedor com: razão social, CNPJ, telefone, e-mail, contato, cidade, estado e observações
- [RF-018.2] Editar dados do fornecedor
- [RF-018.3] Inativar fornecedor
- [RF-018.4] Listar fornecedores com filtro por status e localidade
- [RF-018.5] Visualizar histórico de pedidos de compra vinculados ao fornecedor

**Regras de Negócio:**
- [RN-018.1] CNPJ deve ser único e validado no formato correto
- [RN-018.2] Fornecedores inativos não aparecem nas seleções de pedido de compra

---

### RF-019 — Relatórios de Abastecimentos (Engenharia)

**Setor/Perfil com acesso:** ENGENHARIA (Admin e Operador)
**Descrição:** Relatórios consolidados de abastecimento de combustíveis por obra, equipe e período, para controle de custos operacionais.

**Funcionalidades:**
- [RF-019.1] Filtrar abastecimentos por período, equipe, obra e tipo de combustível
- [RF-019.2] Exibir tabela com: data, veículo, tipo, litros, valor, km/horômetro e obra vinculada
- [RF-019.3] Exibir totais consolidados por equipe e obra
- [RF-019.4] Exportar relatório em CSV

**Regras de Negócio:**
- [RN-019.1] Apenas abastecimentos vinculados a obras do setor de Engenharia são exibidos neste relatório

---

### RF-020 — Suprimentos KOBO

**Setor/Perfil com acesso:** ENGENHARIA (Admin e Operador); ALMOXARIFADO (Admin)
**Descrição:** Integração com a plataforma KoboToolbox para importação de pedidos de suprimentos enviados em campo via formulário externo.

**Funcionalidades:**
- [RF-020.1] Buscar e exibir pedidos pendentes oriundos do KoboToolbox em tempo real
- [RF-020.2] Visualizar detalhes completos de cada pedido importado (itens, quantidades, solicitante, obra)
- [RF-020.3] Converter pedido KoboToolbox em Solicitação de Compra (SC) com um clique
- [RF-020.4] Marcar pedido como processado para não reaparecer na lista de pendentes

**Regras de Negócio:**
- [RN-020.1] A integração usa a API oficial do KoboToolbox — credenciais configuradas nas variáveis de ambiente
- [RN-020.2] Pedidos já convertidos em SC não podem ser convertidos novamente

---

### RF-021 — Meus Pedidos (Manutenção)

**Setor/Perfil com acesso:** MANUTENÇÃO (Admin e Operador)
**Descrição:** Visão personalizada do operador de manutenção, exibindo apenas os pedidos de compra criados por ele ou pelo seu setor.

**Funcionalidades:**
- [RF-021.1] Listar pedidos criados pelo setor de Manutenção com: número, data, status, fornecedor e valor total
- [RF-021.2] Filtrar por status (Pendente / Aprovado / Concluído / Cancelado) e período
- [RF-021.3] Visualizar detalhe completo do pedido em modal
- [RF-021.4] Criar novo pedido diretamente a partir desta tela

**Regras de Negócio:**
- [RN-021.1] O operador de Manutenção só visualiza pedidos criados pelo setor de Manutenção

---

### RF-022 — Pedidos de Compra

**Setor/Perfil com acesso:** ENGENHARIA e MANUTENÇÃO (Admin e Operador)
**Descrição:** Criação, gestão e aprovação de Pedidos de Compra (PC) com cotação de fornecedores e rastreamento de status.

**Funcionalidades:**
- [RF-022.1] Criar Pedido de Compra com: número automático, data, solicitante, setor, obra/centro de custo, dados do fornecedor (nome, CNPJ, tel, contato, e-mail), condições de pagamento, local e data de entrega
- [RF-022.2] Adicionar múltiplos itens ao PC: nome, quantidade, unidade, preço unitário, desconto e data de entrega por item
- [RF-022.3] Calcular automaticamente frete, outras despesas, descontos e total do pedido
- [RF-022.4] Alterar status do PC: Pendente → Aprovado → Concluído (ou Cancelado)
- [RF-022.5] Vincular PC a uma Solicitação de Compra (SC) de referência
- [RF-022.6] Gerar documento imprimível do Pedido de Compra (PDF/Visualização)
- [RF-022.7] Listar todos os PCs com filtros por status, fornecedor, setor e período

**Regras de Negócio:**
- [RN-022.1] Somente Admin pode aprovar ou cancelar um PC
- [RN-022.2] PC cancelado não pode ser reaberto — deve-se criar um novo
- [RN-022.3] O valor total = soma dos itens + frete + outras despesas − descontos

---

### RF-023 — Segurança & EPI

**Setor/Perfil com acesso:** ENGENHARIA e MANUTENÇÃO (Admin e Operador)
**Descrição:** Controle de validade e entrega de Equipamentos de Proteção Individual (EPIs) aos colaboradores.

**Funcionalidades:**
- [RF-023.1] Registrar entrega de EPI a um colaborador com: data de entrega, tipo de EPI, próxima data de troca e responsável
- [RF-023.2] Listar todos os registros de EPI com situação de validade (válido / próximo ao vencimento / vencido)
- [RF-023.3] Filtrar por colaborador, tipo de EPI e situação de validade
- [RF-023.4] Exibir alerta visual para EPIs com vencimento próximo (≤ 30 dias) e vencidos

**Regras de Negócio:**
- [RN-023.1] EPIs vencidos devem aparecer com destaque visual em vermelho
- [RN-023.2] EPIs a vencer em até 30 dias devem aparecer com destaque em âmbar

---

### RF-024 — Equipamentos Pesados

**Setor/Perfil com acesso:** ENGENHARIA e MANUTENÇÃO (Admin e Operador)
**Descrição:** Cadastro e histórico de manutenção e uso de equipamentos pesados (retroescavadeiras, motoniveladoras, caminhões, etc.).

**Funcionalidades:**
- [RF-024.1] Cadastrar equipamento com: nome, tipo, número de série, equipe responsável, status e observações
- [RF-024.2] Registrar movimentação do equipamento: data, tipo de evento (manutenção/deslocamento/retorno), responsável e observação
- [RF-024.3] Listar equipamentos com filtros por tipo, equipe e status
- [RF-024.4] Visualizar histórico completo de movimentações de cada equipamento

**Regras de Negócio:**
- [RN-024.1] Equipamentos inativos não aparecem nas seleções de obras ativas

---

### RF-025 — Débitos Oficina

**Setor/Perfil com acesso:** ENGENHARIA e MANUTENÇÃO (Admin e Operador)
**Descrição:** Controle financeiro de débitos gerados por serviços de oficina e manutenção de veículos e equipamentos.

**Funcionalidades:**
- [RF-025.1] Registrar débito com: número, pedido de origem, data, equipe, colaborador, almoxarifado e itens (nome, qtd, unidade, preço, frota)
- [RF-025.2] Calcular e exibir valor total do débito
- [RF-025.3] Alterar status do débito: ABERTO → PAGO (com data de pagamento)
- [RF-025.4] Listar débitos com filtros por status, equipe e período
- [RF-025.5] Exibir KPI de total em aberto e total pago

**Regras de Negócio:**
- [RN-025.1] Débitos pagos não podem ser reabertos
- [RN-025.2] Somente Admin pode marcar um débito como pago

---

### RF-026 — Segurança de Dados

**Setor/Perfil com acesso:** ENGENHARIA (Admin); ALMOXARIFADO (Admin)
**Descrição:** Gestão de backup do banco de dados e configurações de conectividade com serviços externos.

**Funcionalidades:**
- [RF-026.1] Exibir status da conexão com o banco de dados em nuvem
- [RF-026.2] Acionar sincronização manual de todos os dados
- [RF-026.3] Gerar e baixar backup completo do banco de dados
- [RF-026.4] Configurar credenciais de serviços externos (Supabase, KoboToolbox)
- [RF-026.5] Exibir log das últimas sincronizações com status de sucesso/erro

**Regras de Negócio:**
- [RN-026.1] Somente Admin tem acesso ao módulo de Segurança de Dados
- [RN-026.2] Credenciais configuradas devem ser mascaradas na interface após salvar

---

### RF-027 — Administração de Usuários

**Setor/Perfil com acesso:** Admin apenas
**Descrição:** Gestão completa de usuários do sistema, com controle de nível de acesso e módulos permitidos por usuário.

**Funcionalidades:**
- [RF-027.1] Cadastrar novo usuário com: nome, login, senha, nível (Admin/Operador), setor e lista de módulos autorizados
- [RF-027.2] Editar dados e permissões de usuário existente
- [RF-027.3] Redefinir senha de usuário
- [RF-027.4] Inativar usuário (soft delete — não excluir)
- [RF-027.5] Listar usuários com filtros por setor e nível
- [RF-027.6] Visualizar log de atividades por usuário

**Regras de Negócio:**
- [RN-027.1] Apenas Admin pode criar, editar ou inativar usuários
- [RN-027.2] Não é possível inativar o próprio usuário logado
- [RN-027.3] A senha deve ter no mínimo 6 caracteres
- [RN-027.4] O usuário admin@admin.com com senha 123456 deve existir por padrão (seeder)

---

## Matriz de Permissões

| Módulo                    | ALMOX Operador | ALMOX Admin | ENG Operador | ENG Admin | MANUT Operador | MANUT Admin |
|---------------------------|:-:|:-:|:-:|:-:|:-:|:-:|
| Landing Page              | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Login                     | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dashboard Geral           | ✅ | ✅ | — | — | — | — |
| Consultar Catálogo        | ✅ | ✅ | — | — | — | — |
| Registrar Entrada         | ✅ | ✅ | — | — | — | — |
| Registrar Saída           | ✅ | ✅ | — | — | — | — |
| Histórico de Cupons       | ✅ | ✅ | — | — | — | — |
| Devolução                 | ✅ | ✅ | — | — | — | — |
| Entregas Pendentes        | ✅ | ✅ | — | — | — | — |
| Combustíveis              | ✅ | ✅ | — | — | — | — |
| Fichas de Produtos        | 👁️ | ✅ | — | — | — | — |
| Valor de Estoque          | — | ✅ | — | — | — | — |
| Inventário Geral          | — | ✅ | — | — | — | — |
| Funcionários              | ✅ | ✅ | — | — | — | — |
| Equipes de Campo          | ✅ | ✅ | — | — | — | — |
| Frotas de Veículos        | ✅ | ✅ | — | — | — | — |
| Obras/Projetos            | — | — | ✅ | ✅ | — | — |
| Fornecedores              | 👁️ | 👁️ | — | ✅ | — | — |
| Rel. Abastecimentos       | — | — | ✅ | ✅ | — | — |
| Suprimentos KOBO          | — | ✅ | ✅ | ✅ | — | — |
| Meus Pedidos              | — | — | — | — | ✅ | ✅ |
| Pedidos de Compra         | — | — | ✅ | ✅ | ✅ | ✅ |
| Segurança & EPI           | — | — | ✅ | ✅ | ✅ | ✅ |
| Equipamentos Pesados      | — | — | ✅ | ✅ | ✅ | ✅ |
| Débitos Oficina           | — | — | ✅ | ✅ | ✅ | ✅ |
| Segurança de Dados        | — | ✅ | — | ✅ | — | — |
| Administração de Usuários | — | ✅ | — | — | — | — |

> ✅ = Acesso total | 👁️ = Somente leitura | — = Sem acesso

---

## Glossário

| Termo            | Definição                                                                 |
|------------------|---------------------------------------------------------------------------|
| Almoxarifado     | Setor responsável pelo estoque e movimentação de materiais                |
| SC               | Solicitação de Compra — documento interno de requisição de materiais      |
| PC               | Pedido de Compra — documento formal enviado ao fornecedor                 |
| NF               | Nota Fiscal — documento fiscal que acompanha a entrada de materiais       |
| Slip / Cupom     | Documento de saída de materiais emitido pelo almoxarife                   |
| EPI              | Equipamento de Proteção Individual                                        |
| Soft Delete      | Exclusão lógica — o registro é inativado mas não removido do banco        |
| Centro de Custo  | Código que identifica a obra ou projeto para fins de rateio de custos     |
| KoboToolbox      | Plataforma externa de coleta de dados via formulários (integração)        |
| GEPLAN           | Sistema de Gestão Operacional para empresas de terraplanagem e obras      |
