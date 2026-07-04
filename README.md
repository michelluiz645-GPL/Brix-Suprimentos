# GEPLAN — Sistema de Gestão Operacional

Sistema de gestão operacional para empresas de terraplanagem, obras e conservação, cobrindo três setores: **Almoxarifado**, **Engenharia** e **Manutenção**. Controla estoque, combustíveis, EPI, frotas, equipes de campo, obras/projetos, solicitações e pedidos de compra, além de integração com o KoboToolbox para coleta de pedidos em campo.

## Stack

| Camada         | Tecnologia                        |
|----------------|------------------------------------|
| Backend        | Laravel 11+, PHP 8.4+, MySQL 8     |
| Autenticação   | Laravel Sanctum                    |
| Frontend       | React 19, TypeScript 5+, Vite      |
| Estilo         | Tailwind CSS 4                     |
| Roteamento     | React Router 6                     |
| Infraestrutura | Docker, Docker Compose, Nginx      |

## Estrutura de Pastas

```
/
├── backend/                  ← Laravel 11 (API)
│   ├── app/Http/Controllers/
│   ├── app/Http/Requests/
│   ├── app/Http/Resources/
│   ├── app/Models/
│   ├── app/Services/
│   ├── app/Console/Commands/
│   ├── database/migrations/
│   ├── database/seeders/
│   └── routes/api.php
├── src/pages/                ← React: páginas
├── src/components/           ← React: componentes reutilizáveis
├── src/services/              ← React: chamadas de API
├── src/hooks/                ← React: hooks customizados
├── src/utils/                 ← React: funções utilitárias
├── docker/                    ← Dockerfiles, configs do Nginx e init do MySQL
├── CLAUDE.md                  ← regras de desenvolvimento e requisitos funcionais
├── Makefile
├── .env.example
├── App.tsx
├── main.tsx
└── vite.config.ts
```

## Como rodar

**Pré-requisitos:** Docker e Docker Compose.

```bash
cp .env.example .env       # preencha com suas credenciais locais
cp backend/.env.example backend/.env
make up                    # sobe o ambiente de desenvolvimento
make install                # composer install + key:generate + migrate:fresh --seed + npm install
```

- Frontend (Vite): http://localhost:5173
- Backend (via Nginx): http://localhost:8080
- Usuário admin padrão (seed): `admin@admin.com` / `123456`

Principais comandos (ver `Makefile` para a lista completa):

| Comando        | Descrição                                       |
|----------------|---------------------------------------------------|
| `make up`      | Sobe o ambiente de desenvolvimento                 |
| `make up-prod` | Sobe o ambiente de produção                        |
| `make down`    | Derruba todos os containers                        |
| `make migrate` | Executa as migrations                              |
| `make seed`    | Executa os seeders                                 |
| `make fresh`   | Drop + migrate + seed                              |
| `make backup`  | Gera um backup manual do banco de dados            |
| `make shell`   | Abre shell bash no container da aplicação          |
| `make db`      | Abre shell do MySQL no container                   |
| `make deploy`  | Pull + deploy completo em produção                 |

## Backup e persistência de dados

O banco roda em um volume Docker persistente. Além disso:

- **Backup automático diário** (2h) do banco via `php artisan backup:database`, executado pelo container `scheduler`, salvo em `backend/storage/app/backups/` (retenção de 30 dias).
- **Anexos** (notas fiscais, EPI, pedidos etc.) organizados por setor em `backend/storage/app/anexos/{almoxarifado,engenharia,manutencao}/`.

Ambos usam volumes nomeados em produção, sobrevivendo a rebuilds/deploys.

## Segurança

Nenhuma credencial (Supabase, KoboToolbox, banco de dados) deve aparecer em texto puro em código, commit ou log — tudo vive em `.env`. Veja `CLAUDE.md` para as regras completas do projeto, incluindo a rotação obrigatória de credenciais herdadas do sistema legado.

## Documentação completa

As regras de desenvolvimento, convenções de código, paleta visual e todos os requisitos funcionais (RF-001 a RF-029) estão descritos em [`CLAUDE.md`](./CLAUDE.md).
