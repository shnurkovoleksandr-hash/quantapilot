№2. Окружение (macOS Sequoia 15.6) — детально

1. Базовые зависимости

- Установи Xcode CLT:

```bash
xcode-select --install || true
```

- Установи Homebrew и обнови PATH:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
brew update
```

2. Системные пакеты

```bash
brew install git gh jq yq gnu-sed coreutils wget make openssl@3 \
  age sops direnv \
  python@3.11 pyenv \
  node@22 \
  postgresql@15 \
  --quiet
```

Заметки: Python используем 3.11, Node 22 для совместимости, локальный Postgres нужен только для утилит; основной — через Docker на п.9.

3. Node.js и PNPM

```bash
# включить corepack и pnpm
corepack enable
corepack use pnpm@9
node -v && pnpm -v
# глобальные утилиты по желанию
pnpm add -g npm-check-updates
```

4. Python 3.11 из pyenv (чистые venv)

```bash
pyenv install -s 3.11.9
pyenv global 3.11.9
python -V
pip install --upgrade pip
```

5. Docker Desktop

- Установи из dmg или через brew: `brew install --cask docker`.
- Запусти Docker Desktop один раз для инициализации.
- Проверь:

```bash
docker version
docker run --rm hello-world
```

6. OpenAI SDK и Ajv CLI (локально в репозитории)
   Будет выполнено при инициализации репо (п.3/п.6). Для проверки окружения можно установить глобально:

```bash
pnpm add -g ajv-cli@5
pnpm add -g openai@4
ajv --version && node -e "console.log(require('openai/package.json').version)"
```

7. GitHub CLI и аутентификация

```bash
gh auth login       # выбери HTTPS, Browser login
gh auth status
git config --global init.defaultBranch main
git config --global pull.rebase false
```

8. SOPS + age ключи

```bash
age-keygen -o ~/.config/sops/age/keys.txt
chmod 600 ~/.config/sops/age/keys.txt
# покажи публичный ключ (для .sops.yaml):
grep -m1 -o 'age1.*' ~/.config/sops/age/keys.txt
```

Публичный ключ запишем в `.sops.yaml` на п.8 гайда.

9. Postgres через Docker (санити-тест окружения)

```bash
docker pull postgres:15
docker run --rm -e POSTGRES_PASSWORD=pass -p 5432:5432 -d --name pg15 postgres:15
sleep 3
docker logs --tail=20 pg15
docker stop pg15
```

10. Direnv и переменные окружения

```bash
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc
source ~/.zshrc
# в корне репо позже создадим .env.example и .envrc (п.8 гайда)
```

11. Инструменты YAML/JSON

- `jq`, `yq`, `gsed` уже установлены.
- Проверка:

```bash
jq --version && yq --version && gsed --version | head -n1
```

12. Опционально: n8n локально для проверки образа
    Полный развертыванием в п.12. Здесь только sanity:

```bash
docker pull n8nio/n8n:latest
docker run --rm -p 5678:5678 n8nio/n8n:latest
# останови Ctrl+C
```

13. Конфигурация shell
    Добавь в `~/.zshrc`:

```bash
export PATH="/opt/homebrew/opt/openssl@3/bin:$PATH"
export LDFLAGS="-L/opt/homebrew/opt/openssl@3/lib"
export CPPFLAGS="-I/opt/homebrew/opt/openssl@3/include"
```

14. Верификация окружения (чек-лист)

```bash
node -v            # v22.x
pnpm -v            # v9.x
python -V          # 3.11.x
docker version     # ок
gh auth status     # ок
sops --version && age --version
ajv --version
jq --version && yq --version
```

15. Выходы шага

- Готовая система с Node 22, PNPM 9, Python 3.11, Docker, gh, sops/age, jq/yq, ajv.
- Сгенерирован age-ключ, подтверждена работа Docker и Postgres-образа, проверен образ n8n.
- Shell и PATH настроены.

16. Acceptance для шага №2

- ✅ Все версии соответствуют.
- ✅ `docker run hello-world` проходит.
- ✅ `gh auth status` без ошибок.
- ✅ Публичный age-ключ получен.
- ✅ Команда `ajv --version` отрабатывает.
