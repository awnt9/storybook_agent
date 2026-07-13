COMPOSE := docker compose
APP_SERVICES := frontend backend

.DEFAULT_GOAL := update

.PHONY: help update update-clean restart logs ps

help:
	@echo "StoryBook Agent — Docker Compose shortcuts"
	@echo ""
	@echo "  make              Rebuild app images and relaunch stack (default)"
	@echo "  make update       Same as default"
	@echo "  make update-clean Rebuild without Docker cache"
	@echo "  make restart      Relaunch stack without rebuilding images"
	@echo "  make logs         Tail frontend + backend logs"
	@echo "  make ps           Show compose service status"

update:
	$(COMPOSE) build --pull $(APP_SERVICES)
	$(COMPOSE) up -d --force-recreate --remove-orphans
	$(COMPOSE) ps

update-clean:
	$(COMPOSE) build --pull --no-cache $(APP_SERVICES)
	$(COMPOSE) up -d --force-recreate --remove-orphans
	$(COMPOSE) ps

restart:
	$(COMPOSE) up -d --force-recreate --remove-orphans
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f --tail=100 $(APP_SERVICES)

ps:
	$(COMPOSE) ps
