# GEPLAN — Makefile
# Software House Thiago Ferreira

COMPOSE      := docker compose
COMPOSE_PROD := docker compose -f docker-compose.prod.yml

GREEN  := \033[0;32m
YELLOW := \033[1;33m
RED    := \033[0;31m
BLUE   := \033[0;34m
RESET  := \033[0m

.PHONY: dev build start stop deploy clean logs lint send help

help:
	@echo ""
	@echo "$(BLUE)╔══════════════════════════════════════════╗$(RESET)"
	@echo "$(BLUE)║          GEPLAN — Comandos Make          ║$(RESET)"
	@echo "$(BLUE)╚══════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "  $(GREEN)make dev$(RESET)      Sobe ambiente de desenvolvimento (Docker)"
	@echo "  $(GREEN)make build$(RESET)    Build do frontend React → dist/"
	@echo "  $(GREEN)make start$(RESET)    Sobe produção no DigitalOcean"
	@echo "  $(GREEN)make stop$(RESET)     Derruba todos os containers de produção"
	@echo "  $(GREEN)make deploy$(RESET)   git pull + rebuild produção"
	@echo "  $(GREEN)make clean$(RESET)    Remove containers, volumes e dist/"
	@echo "  $(GREEN)make logs$(RESET)     Tail dos logs de produção"
	@echo "  $(GREEN)make lint$(RESET)     Verificação TypeScript (sem emitir)"
	@echo "  $(GREEN)make send$(RESET)     Lint + commit + PR + merge para main"
	@echo ""

# ──────────────────────────────────────────
# DESENVOLVIMENTO
# ──────────────────────────────────────────

dev:
	@echo "$(GREEN)Subindo ambiente de desenvolvimento...$(RESET)"
	$(COMPOSE) up --build

lint:
	@echo "$(BLUE)Verificando tipos TypeScript...$(RESET)"
	npm run lint
	@echo "$(GREEN)✅ Sem erros de tipo.$(RESET)"

# ──────────────────────────────────────────
# BUILD
# ──────────────────────────────────────────

build:
	@echo "$(BLUE)Gerando build de produção do frontend...$(RESET)"
	npm run build
	@echo "$(GREEN)✅ dist/ gerado com sucesso.$(RESET)"

# ──────────────────────────────────────────
# PRODUÇÃO — DigitalOcean Droplet
# ──────────────────────────────────────────

start:
	@echo "$(GREEN)Subindo ambiente de produção...$(RESET)"
	$(COMPOSE_PROD) up -d --build
	@echo "$(GREEN)✅ Produção no ar.$(RESET)"

stop:
	@echo "$(YELLOW)Derrubando produção...$(RESET)"
	$(COMPOSE_PROD) down
	@echo "$(GREEN)✅ Containers encerrados.$(RESET)"

deploy:
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo "$(BLUE)  GEPLAN — Deploy DigitalOcean        $(RESET)"
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	git pull origin main
	npm install
	npm run build
	$(COMPOSE_PROD) up -d --build
	docker system prune -f
	@echo "$(GREEN)✅ Deploy concluído.$(RESET)"

logs:
	$(COMPOSE_PROD) logs -f

clean:
	@echo "$(RED)⚠️  Removendo containers, volumes e dist/...$(RESET)"
	$(COMPOSE) down -v 2>/dev/null || true
	$(COMPOSE_PROD) down -v 2>/dev/null || true
	rm -rf dist dist-backend
	@echo "$(GREEN)✅ Limpeza concluída.$(RESET)"

# ──────────────────────────────────────────
# SEND — lint + commit + PR + merge para main
# ──────────────────────────────────────────

send:
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo "$(BLUE)  GEPLAN — make send            $(RESET)"
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo ""
	@$(MAKE) lint
	@echo ""
	@read -p "📝 Mensagem do commit: " MSG; \
	BRANCH="auto/$$(date +%Y%m%d-%H%M%S)"; \
	echo "$(BLUE)Criando branch $$BRANCH...$(RESET)"; \
	git checkout -b $$BRANCH; \
	git add -A; \
	if git diff --cached --quiet; then \
		echo "$(YELLOW)Nenhuma alteração para commitar.$(RESET)"; \
		git checkout main; \
		git branch -D $$BRANCH; \
	else \
		git commit -m "$$MSG"; \
		git push origin $$BRANCH; \
		gh pr create --title "$$MSG" --body "Deploy automático via make send." --base main --head $$BRANCH; \
		gh pr merge --merge --delete-branch; \
		git checkout main; \
		git pull origin main; \
		git branch -D $$BRANCH 2>/dev/null || true; \
		echo "$(GREEN)✅ Código enviado e mergeado para main com sucesso.$(RESET)"; \
	fi
