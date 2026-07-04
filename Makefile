.PHONY: up up-prod down migrate seed fresh deploy send db tinker thinker shell install build-frontend key-generate logs

# ── Ambiente de desenvolvimento ──────────────────────────────────────────────
up:
	docker compose up -d --build

up-prod:
	docker compose -f docker-compose.prod.yml up -d --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=100

# ── Banco de dados ────────────────────────────────────────────────────────────
migrate:
	docker compose exec app php artisan migrate

seed:
	docker compose exec app php artisan db:seed

fresh:
	docker compose exec app php artisan migrate:fresh --seed

db:
	docker compose exec db mysql -u root -p geplan

# ── Laravel ───────────────────────────────────────────────────────────────────
tinker:
	docker compose exec app php artisan tinker

# alias mantido por compatibilidade com a nomenclatura do CLAUDE.md
thinker: tinker

shell:
	docker compose exec app bash

key-generate:
	docker compose exec app php artisan key:generate

# ── Primeira instalação (depois de `composer create-project` / `npm create vite`) ─
install:
	docker compose exec app composer install
	docker compose exec app php artisan key:generate
	docker compose exec app php artisan migrate:fresh --seed
	docker compose exec frontend npm install

build-frontend:
	docker compose exec frontend npm run build

# ── Deploy / Git ──────────────────────────────────────────────────────────────
deploy:
	git pull origin main
	docker compose -f docker-compose.prod.yml up -d --build
	docker compose -f docker-compose.prod.yml exec app php artisan migrate --force
	docker compose -f docker-compose.prod.yml exec app php artisan optimize

send:
	@echo "Mensagem do commit:"; \
	read -p "> " msg; \
	npm run lint --silent || true; \
	git add . && git commit -m "$$msg" && git push origin HEAD
