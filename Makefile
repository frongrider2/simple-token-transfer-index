dbup:
	docker compose -f docker-compose-db.yml up -d --build

dbdown:
	docker compose -f docker-compose-db.yml down

.PHONY: dbup dbdown