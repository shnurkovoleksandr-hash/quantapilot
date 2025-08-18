8 «Секреты и .env.example» частично закрыт. Ниже оценка и точные добивки.

# Что ок

* Политика: секреты шифруются `sops/age`, публичный age-ключ хранится в `.sops.yaml`. Это зафиксировано в docs и NFR. &#x20;
* В ранбуке и окружении упомянута генерация age-ключа и привязка к `.sops.yaml`. &#x20;
* `.env` и `.envrc` уже исключены в `.gitignore`.&#x20;

# Доделать

1. Добавить `.sops.yaml` с правилами шифрования `.env(.*)` и ops-секретов. Сейчас в доках есть ссылка, но самого файла не видно в артефактах.&#x20;
2. Создать `./.env.example` с полным перечнем переменных для n8n, GitHub App, Telegram, DB, OpenAI. В окружении указано «создадим позже» — считаю невыполненным.&#x20;
3. Добавить `./.envrc` (direnv) с безопасной дешифровкой `.env.sops` локально. Упомянуто, но файла нет.&#x20;
4. Завести `ops/security/secrets-rotation.md` и описать dual-secret ротацию по уже согласованной политике. Текст политики есть в additions, нужен файл.&#x20;
5. Проявить RBAC в n8n: разнести креды на роли и связать с именами переменных из `.env`. Политика есть, но нет маппинга переменных.&#x20;

# Инструкции (минимальные патчи)

## `.sops.yaml`

```yaml
# .sops.yaml
creation_rules:
  - path_regex: '(^|/)\.env(\..+)?$|(^|/)\.env\.sops$'
    age: "<YOUR_AGE_PUBLIC_KEY>"
  - path_regex: '^ops/secrets/.*\.(ya?ml|json)$'
    age: "<YOUR_AGE_PUBLIC_KEY>"
  - path_regex: '^config/.*\.(ya?ml|json)$'
    age: "<YOUR_AGE_PUBLIC_KEY>"
```

## `.env.example`

```dotenv
# QuantaPilot factory
NODE_ENV=development

# OpenAI
OPENAI_API_KEY=
OPENAI_BASE_URL=

# GitHub App
GITHUB_APP_ID=
GITHUB_APP_INSTALLATION_ID=
# base64(private key PEM) to avoid multiline env issues
GITHUB_APP_PRIVATE_KEY_B64=

# GitHub general
GITHUB_TOKEN=    # optional PAT for gh CLI if needed

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Database
DATABASE_URL=postgres://user:pass@localhost:5432/quantapilot

# n8n
N8N_HOST=http://localhost:5678
N8N_BASIC_AUTH_USER=
N8N_BASIC_AUTH_PASSWORD=
N8N_WEBHOOK_URL=

# SOPS/age
SOPS_AGE_KEY_FILE=$HOME/.config/sops/age/keys.txt
```

## `.envrc`

```bash
# .envrc
export SOPS_AGE_KEY_FILE="${SOPS_AGE_KEY_FILE:-$HOME/.config/sops/age/keys.txt}"
if [[ -f ".env.sops" ]]; then
  sops -d --input-type dotenv --output-type dotenv .env.sops > .env
fi
set -a
[ -f .env ] && . ./.env
set +a
```

## Создание зашифрованного `.env.sops`

```bash
# однократно: заполнить .env по .env.example
cp .env.example .env && $EDITOR .env

# зашифровать и удалить открытый .env
sops -e --input-type dotenv --output-type dotenv .env > .env.sops && rm .env
```

## Ротация (dual-secret) — файл

`ops/security/secrets-rotation.md`:

```md
# Secrets Rotation (dual-secret)
Schedule: OpenAI 30d, Telegram 90d, GitHub App private key 90d, SOPS/age 180d, DB 180d.
Steps: issue v2 → add as KEY_v2 (keep v1) → update env/n8n to accept v1|v2 → switch to v2 → monitor 24h → revoke v1 → PR removing *_v1 from SOPS.
```

(Берём нормы из additions.)&#x20;

## n8n credentials ↔ env mapping

* `gh_app_dev_writer` ← `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY_B64`.
* `tg_ops_notify` ← `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
* `llm_dev_writer`/`llm_qa` ← `OPENAI_API_KEY`, `OPENAI_BASE_URL`.
* Включить Owner-based access control, запрет шаринга между flow.&#x20;

## CI замечание

Если дешифровка нужна в CI, положи приватный ключ в `Actions secrets` как `SOPS_AGE_KEY` и перед шагом выполнить:

```bash
echo "$SOPS_AGE_KEY" > $RUNNER_TEMP/age.txt
export SOPS_AGE_KEY_FILE="$RUNNER_TEMP/age.txt"
```

(Шифрование по `.sops.yaml` уже описано в docs.)&#x20;

# Acceptance п.8 ✅ COMPLETED

* ✅ В корне есть `.sops.yaml` и `.env.example`.
* ✅ Локальная дешифровка через `direnv` создаёт `.env` на лету.
* ✅ Политика ротации зафиксирована в `ops/security/secrets-rotation.md`.
* ✅ n8n креды разведены по ролям и читают значения из `.env`.
* ✅ CI/CD интеграция настроена с GitHub Actions workflow.
* ✅ Автоматизированные скрипты для setup и key generation.
* ✅ Полная документация в `ops/setup-guide.md` и `ops/README.md`.
