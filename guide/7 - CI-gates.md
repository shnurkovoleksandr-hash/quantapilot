# 7 «Документация: CI-гейты» реализован на уровне политики. Требуются минимальные доработки.

## Оценка

- Защищённые пути и «жёсткие стопы» оформлены (`policy/enforcer` блокирует бота и требует label для правок workflow).&#x20;
- Фильтры событий CI ограничены разрешёнными путями.&#x20;
- В branch protection перечислены обязательные статус-чеки, включая `docs-lint`.&#x20;
- В требованиях указано: doc-lint на `ajv` — fast-fail.&#x20;
- Уточнено: в CI валидируются схемы/примеры `ajv`.&#x20;

# Что добить (минимум)

1. Дать реальный статус-чек `docs-lint` в Actions. Создай `.github/workflows/docs-lint.yml` с job именем `docs-lint`:

```yaml
name: docs-lint
on:
  pull_request:
    paths:
      - 'docs/**'
      - '_schemas/**'
      - 'examples/**'
      - 'package.json'
      - 'pnpm-lock.yaml'
jobs:
  docs-lint:
    runs-on: ubuntu-latest
    env:
      GH_TOKEN: ${{ github.token }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm i --frozen-lockfile
      - run: pnpm run schema:all # включает validate:quantapilot и docs:lint
```

2. Убедиться, что `policy/enforcer` публикует свой чек с именем `policy/enforcer` и не конфликтует с path-фильтрами основного CI. (Политика на защищённые пути уже описана.) &#x20;

3. Актуализировать правила ветки: в настройках репозитория требовать `docs-lint` и `policy/enforcer` как обязательные чек-статусы, как указано в доке.&#x20;

# Acceptance п.7

- ✅ В PR с изменениями в `docs/**` появляется статус-чек `docs-lint` и проходит.
- ✅ PR затрагивающий защищённые пути блокируется `policy/enforcer` без label/апруверов.&#x20;
- ✅ В правилах ветки `main` включены обязательные `docs-lint` и `policy/enforcer`.&#x20;
