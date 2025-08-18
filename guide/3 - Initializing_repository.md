№3. Инициализация репозитория — детально

1. Создать приватный репозиторий

```bash
mkdir quantapilot && cd quantapilot
git init -b main
gh repo create "$USER/quantapilot" --private --source=. --remote=origin --push
```

2. PNPM монорепо

```bash
pnpm init -y
jq '. + {private:true, packageManager:"pnpm@9"}' package.json > package.tmp && mv package.tmp package.json

cat > pnpm-workspace.yaml <<'YAML'
packages:
  - apps/*
  - packages/*
  - docs
  - scripts
YAML
```

3. Базовые файлы в корне

```bash
cat > .gitignore <<'GIT'
node_modules
dist
.env
.envrc
.DS_Store
coverage
GIT

cat > .editorconfig <<'EC'
root = true
[*]
end_of_line = lf
charset = utf-8
indent_style = space
indent_size = 2
insert_final_newline = true
EC

cat > README.md <<'MD'
# QuantaPilot Factory
Repo: фабрика разработки. См. /docs для проектной документации.
MD

printf "%s\n" "MIT" > LICENSE   # при необходимости заменишь позже
```

4. Структура каталогов (без содержимого, наполнение в шагах 4–6, 7)

```bash
mkdir -p {docs,ops,contracts,prompts,scripts,_schemas,tests,mocks}
mkdir -p apps/orchestrator/flows
mkdir -p packages/{cli,core,diagnostics}
touch apps/orchestrator/flows/.gitkeep tests/.gitkeep mocks/.gitkeep prompts/.gitkeep contracts/.gitkeep
```

5. TypeScript базовая конфигурация

```bash
pnpm -w add -D typescript tsx @types/node
cat > tsconfig.base.json <<'JSON'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "resolveJsonModule": true,
    "declaration": true,
    "outDir": "dist",
    "types": ["node"]
  }
}
JSON
```

6. Корневые скрипты (без линтинга docs; добавим в шагах 6–7)

```bash
jq '.scripts = {
  "build": "pnpm -r --filter ./packages... run build",
  "dev": "pnpm -r --filter ./packages... run dev",
  "test": "echo \"(tests will be added in step 20)\"",
  "clean": "git clean -xdf -e docs"
}' package.json > package.tmp && mv package.tmp package.json
```

7. Скелет пакетов

packages/core

```bash
mkdir -p packages/core/src
cat > packages/core/package.json <<'JSON'
{
  "name": "@quantapilot/core",
  "version": "0.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": "./dist/index.js",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsx watch src/index.ts"
  }
}
JSON
cat > packages/core/tsconfig.json <<'JSON'
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
JSON
cat > packages/core/src/index.ts <<'TS'
// core: контракты фабрики, типы, утилиты. Реализация добавится позже.
export const version = "0.0.0";
TS
```

packages/diagnostics

```bash
mkdir -p packages/diagnostics/src
cat > packages/diagnostics/package.json <<'JSON'
{
  "name": "@quantapilot/diagnostics",
  "version": "0.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": "./dist/index.js",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "@quantapilot/core": "workspace:*"
  }
}
JSON
cat > packages/diagnostics/tsconfig.json <<'JSON'
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
JSON
cat > packages/diagnostics/src/index.ts <<'TS'
// diagnostics: логи, реплей, формирование repro.json. Реализация позже.
export function stub() { return true; }
TS
```

packages/cli

```bash
mkdir -p packages/cli/src
cat > packages/cli/package.json <<'JSON'
{
  "name": "@quantapilot/cli",
  "version": "0.0.0",
  "type": "module",
  "bin": { "qp": "dist/index.js" },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "@quantapilot/core": "workspace:*",
    "@quantapilot/diagnostics": "workspace:*"
  }
}
JSON
cat > packages/cli/tsconfig.json <<'JSON'
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
JSON
cat > packages/cli/src/index.ts <<'TS'
#!/usr/bin/env node
// CLI-заглушка. Реализация команд появится после п.12–19.
console.log("QuantaPilot CLI ready");
TS
```

8. Заготовки под будущие шаги (без содержимого)

```bash
# документы создадим по шагам 4–6; сейчас только директория
mkdir -p docs
# конфиги оркестратора и docker-compose добавим в шаге 12
mkdir -p ops/docker
# схемы заполним в шагах 5–6; сейчас шаблон
cat > _schemas/README.md <<'MD'
Схемы фабрики. Содержимое добавится в шагах 5–6.
MD
```

9. Установка общих дев-зависимостей форматирования (минимум, без правил доков)

```bash
pnpm -w add -D eslint @eslint/js eslint-config-prettier prettier
cat > eslint.config.js <<'JS'
import js from "@eslint/js";
export default [{ ...js.configs.recommended, ignores: ["dist","docs"] }];
JS
cat > .prettierrc <<'JSON'
{ "semi": false, "singleQuote": true }
JSON
```

10. Первичная сборка и коммит

```bash
pnpm -r build
git add .
git commit -m "chore(repo): init monorepo skeleton"
git push -u origin main
```

11. Выходы шага

- Приватный монорепозиторий с корневой конфигурацией.
- Пакеты: `@quantapilot/core`, `@quantapilot/diagnostics`, `@quantapilot/cli`.
- Скелеты каталогов `apps/orchestrator`, `contracts`, `prompts`, `_schemas`, `scripts`, `docs`, `tests`, `mocks`.
- Базовый TS-конфиг и инструменты форматирования.

12. Acceptance для шага №3

- `pnpm -r build` проходит без ошибок.
- `qp` после `pnpm --filter @quantapilot/cli run dev` выводит «QuantaPilot CLI ready».
- Пуш в `main` выполнен.
- В дереве присутствуют все каталоги и файлы из пунктов 3–7.
