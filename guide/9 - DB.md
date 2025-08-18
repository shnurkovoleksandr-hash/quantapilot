9 - Базы данных

# Что есть

- PostgreSQL принят как дефолтная БД, целевая версия 15 зафиксирована в constraints и runbook. &#x20;
- Пример `docker-compose` для `postgres:15` присутствует.&#x20;
- Retention и агрегации через `pg_cron` описаны SQL-фрагментами.&#x20;
- Миграции указаны как dbmate/Prisma с скриптами `db:*`.&#x20;
- Инциденты: «Database unavailable» + требование следить за `pg_cron`.&#x20;
- Политика: `db/migrations/**` — защищённый путь.&#x20;

# Несоответствия

- Разнобой переменных: в `.env.example` — `DATABASE_URL`, в additions — `POSTGRES_URL`. Стандартизируй на `DATABASE_URL`. &#x20;
- В фрагменте compose нет `healthcheck`, init-скриптов и `pg_cron`/`pgcrypto`.&#x20;
- Нет явных миграций/сидов в репозитории (`db/migrations` / `db/seeds`). Основание: только политика и скрипты без артефактов. &#x20;

# Что доделать (минимальные патчи)

1. `ops/docker/docker-compose.yml`
   Добавь здоровье, volume init и включи `pg_cron`:

```yaml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: quantapilot
      POSTGRES_USER: qp
      POSTGRES_PASSWORD: qp
    ports: ['5432:5432']
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./ops/db/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB']
      interval: 5s
      timeout: 3s
      retries: 20
volumes: { pgdata: {} }
```

2. `ops/db/init/00_extensions.sql`
   Установи расширения, подготовь `pg_cron`:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- pg_cron требует shared_preload_libraries; в деве можно отключить задания, если недоступно
DO $$ BEGIN
  PERFORM 1 FROM pg_available_extensions WHERE name='pg_cron';
  IF FOUND THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  END IF;
END $$;
```

3. `ops/db/init/10_schemas.sql`
   Базовые схемы и роли под RLS:

```sql
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS pii;
CREATE SCHEMA IF NOT EXISTS audit;
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'svc_quanta') THEN
    CREATE ROLE svc_quanta LOGIN PASSWORD 'devonly';
  END IF;
END $$;
```

4. `db/migrations` + инструмент
   Выбери один: **dbmate** или **Prisma Migrate**. Для dbmate:

```bash
pnpm add -D dbmate sqlfluff
mkdir -p db/migrations db/seeds
```

`package.json`:

```json
{
  "scripts": {
    "db:up": "dbmate up",
    "db:down": "dbmate down",
    "db:new": "dbmate new",
    "db:seed": "psql \"$DATABASE_URL\" -f db/seeds/seed.sql",
    "db:lint": "sqlfluff lint db/migrations --dialect=postgres"
  }
}
```

5. `db/seeds/seed.sql`
   Сиды под политику данных и UI:

```sql
-- пример сидов и RLS
ALTER TABLE pii."user" ENABLE ROW LEVEL SECURITY;
CREATE POLICY pii_service_only ON pii."user"
  USING (current_user = 'svc_quanta');
CREATE OR REPLACE VIEW pii.user_redacted AS
SELECT user_id,
       regexp_replace(email,'(^.).+(@.+$)','\\1***\\2') AS email,
       left(telegram_id,3)||'***' AS telegram_id,
       github_username, display_name, created_at
FROM pii."user";
```

(соответствует additions) &#x20;
6\) `.sqlfluff`

```ini
[sqlfluff]
dialect = postgres
```

7. Единая переменная
   В `.env.example` уже есть `DATABASE_URL` — оставляем её каноничной и заменяем упоминания `POSTGRES_URL` в docs/скриптах. &#x20;

# Acceptance п.9

✅ `docker compose up -d db` поднимает БД, healthcheck зелёный.
✅ `pnpm run db:up && pnpm run db:seed` завершаются без ошибок.
✅ `pnpm run db:lint` чисто.
✅ Retention/rollup задачи создаются только если доступен `pg_cron` (или задокументировано, как в dev отключать).
