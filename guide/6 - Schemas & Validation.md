**Cursor Task — Step 6 “Schemas & Validation” (English only prompt)**

You are operating inside the **QuantaPilot** factory repo. Implement step 6 exactly as specified below.
Rules:

- Do NOT rewrite or delete existing content. Only add or extend.
- If a file already exists, apply **minimal diff** updates and keep existing keys and values.
- All artifacts must be idempotent. Re-running the task must produce zero diffs.
- Project language is **English** for all code and docs.

### 0) Dependencies

1. Add dev dependencies if missing:

```bash
pnpm add -D ajv-cli ajv-formats js-yaml gray-matter glob
```

2. Ensure the repo builds after changes:

```bash
pnpm -r build || true
```

### 1) `_schemas/quantapilot.schema.json`

- If the file exists, **merge** the following structure into it. Preserve any custom fields.
- Ensure `required` includes at least: `stack`, `models`, `budgets`, `steps`.
- Ensure `$defs.modelCfg` and `$defs.stepCfg` exist.
- Allow `additionalProperties: true` at top level to avoid breaking existing configs.

Insert-or-merge JSON (do not drop existing fields):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.quantapilot/quantapilot.schema.json",
  "type": "object",
  "required": ["stack", "models", "budgets", "steps"],
  "properties": {
    "stack": { "type": "object", "additionalProperties": true },
    "models": {
      "type": "object",
      "properties": {
        "arch": { "$ref": "#/$defs/modelCfg" },
        "dev": { "$ref": "#/$defs/modelCfg" },
        "qa": { "$ref": "#/$defs/modelCfg" }
      },
      "additionalProperties": false
    },
    "budgets": {
      "type": "object",
      "properties": {
        "tokens": { "type": "integer", "minimum": 1 },
        "usd": { "type": "number", "minimum": 0 }
      },
      "required": ["tokens"]
    },
    "steps": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/$defs/stepCfg" }
    },
    "gates": {
      "type": "object",
      "properties": {
        "docs_lint": { "type": "boolean" },
        "tests_required": { "type": "boolean" }
      },
      "additionalProperties": false
    },
    "rag": {
      "type": "object",
      "properties": {
        "snapshot_id": { "type": "string" },
        "sources": {
          "type": "array",
          "items": { "type": "string", "format": "uri" }
        }
      },
      "additionalProperties": false
    },
    "env_refs": {
      "type": "object",
      "properties": {
        "openai_key": { "type": "string" },
        "github_key": { "type": "string" },
        "db_url": { "type": "string" }
      },
      "additionalProperties": false
    }
  },
  "$defs": {
    "modelCfg": {
      "type": "object",
      "required": ["model", "temperature", "max_output_tokens"],
      "properties": {
        "model": { "type": "string" },
        "temperature": { "type": "number", "minimum": 0, "maximum": 1 },
        "max_output_tokens": { "type": "integer", "minimum": 1 }
      },
      "additionalProperties": true
    },
    "stepCfg": {
      "type": "object",
      "required": ["name", "timeout_s", "retries", "tokens_budget"],
      "properties": {
        "name": { "enum": ["plan", "impl", "test", "doc", "pr"] },
        "timeout_s": { "type": "integer", "minimum": 1 },
        "retries": { "type": "integer", "minimum": 0 },
        "tokens_budget": { "type": "integer", "minimum": 1 }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": true
}
```

### 2) `examples/quantapilot.example.yml`

- Create `examples/quantapilot.example.yml` if missing.
- Do **not** overwrite an existing `quantapilot.yml` in the repo root.
- The validator will prefer `quantapilot.yml` if present, otherwise the example.

Content:

```yaml
stack:
  runtime: node22
  package_manager: pnpm9
models:
  arch: { model: 'gpt-5-thinking', temperature: 0.2, max_output_tokens: 2000 }
  dev: { model: 'gpt-5', temperature: 0.3, max_output_tokens: 4000 }
  qa: { model: 'gpt-5', temperature: 0.0, max_output_tokens: 1500 }
budgets:
  tokens: 60000
  usd: 10
steps:
  - { name: plan, timeout_s: 300, retries: 2, tokens_budget: 6000 }
  - { name: impl, timeout_s: 1500, retries: 2, tokens_budget: 20000 }
  - { name: test, timeout_s: 600, retries: 2, tokens_budget: 8000 }
  - { name: doc, timeout_s: 300, retries: 1, tokens_budget: 3000 }
  - { name: pr, timeout_s: 300, retries: 1, tokens_budget: 1000 }
gates:
  docs_lint: true
  tests_required: true
rag:
  snapshot_id: 'v1'
  sources: ['https://example.com/policy']
env_refs:
  openai_key: 'OPENAI_API_KEY'
  github_key: 'GITHUB_TOKEN'
  db_url: 'DATABASE_URL'
```

### 3) `_schemas/api.schema.json` and `_schemas/api.examples.json`

- If `_schemas/api.schema.json` exists, merge the **required structure**: `triggers[]` and `events[]` are arrays of objects with at least `name` and `payload_schema` (string or `$ref`). Add optional `version`.
- Create `_schemas/api.examples.json` with one valid trigger and event.

Schema to merge-or-create:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.quantapilot/api.schema.json",
  "type": "object",
  "properties": {
    "triggers": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "payload_schema"],
        "properties": {
          "name": { "type": "string" },
          "payload_schema": { "type": "string" },
          "version": { "type": "string" }
        },
        "additionalProperties": true
      }
    },
    "events": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "payload_schema"],
        "properties": {
          "name": { "type": "string" },
          "payload_schema": { "type": "string" },
          "version": { "type": "string" }
        },
        "additionalProperties": true
      }
    }
  },
  "additionalProperties": true
}
```

Example file:

```json
{
  "triggers": [
    {
      "name": "repo.run",
      "payload_schema": "#/definitions/repoRun",
      "version": "1.0.0"
    }
  ],
  "events": [
    {
      "name": "docs.linted",
      "payload_schema": "#/definitions/docsLint",
      "version": "1.0.0"
    }
  ],
  "definitions": {
    "repoRun": {
      "type": "object",
      "required": ["repo_url", "branch"],
      "properties": {
        "repo_url": { "type": "string", "format": "uri" },
        "branch": { "type": "string" }
      }
    },
    "docsLint": {
      "type": "object",
      "required": ["ok", "checked_files"],
      "properties": {
        "ok": { "type": "boolean" },
        "checked_files": { "type": "integer", "minimum": 0 }
      }
    }
  }
}
```

### 4) `scripts/validate-quantapilot.mjs`

- Create if missing. If exists, update to prefer `quantapilot.yml` else `examples/quantapilot.example.yml`.
- Keep ESM. No external libs beyond `js-yaml`.

Content:

```js
import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import { execaSync } from 'node:child_process'

const candidates = [
  'quantapilot.yml',
  path.join('examples', 'quantapilot.example.yml'),
]
const target = candidates.find((p) => fs.existsSync(p))
if (!target) {
  console.error(
    'No quantapilot config found. Create quantapilot.yml or examples/quantapilot.example.yml.',
  )
  process.exit(1)
}
const data = yaml.load(fs.readFileSync(target, 'utf8'))
const tmp = `.tmp.quantapilot.json`
fs.writeFileSync(tmp, JSON.stringify(data))
try {
  execaSync(
    'npx',
    [
      'ajv',
      'validate',
      '-s',
      '_schemas/quantapilot.schema.json',
      '-d',
      tmp,
      '-c',
      'ajv-formats',
      '--spec=draft2020',
    ],
    { stdio: 'inherit' },
  )
} finally {
  fs.rmSync(tmp, { force: true })
}
```

### 5) `scripts/docs-lint.mjs`

- Create if missing. If exists, leave logic but ensure it only lints Markdown inside `docs/`.
- Use `gray-matter` to parse front-matter. Validate against `_schemas/frontmatter.schema.json`.
- If no files found, exit `0` with a warning (supports your “merged MD for ChatGPT” scenario).

Content:

```js
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import glob from 'glob'
import { execaSync } from 'node:child_process'

const schema = '_schemas/frontmatter.schema.json'
const files = glob.sync('docs/*.md')
if (files.length === 0) {
  console.warn('docs:lint — no docs/*.md found, skipping')
  process.exit(0)
}

let ok = true
for (const file of files) {
  const fm = matter.read(file).data
  const tmp = `.tmp.fm.${path.basename(file)}.json`
  fs.writeFileSync(tmp, JSON.stringify(fm))
  try {
    execaSync(
      'npx',
      [
        'ajv',
        'validate',
        '-s',
        schema,
        '-d',
        tmp,
        '-c',
        'ajv-formats',
        '--spec=draft2020',
      ],
      { stdio: 'pipe' },
    )
  } catch (e) {
    ok = false
    console.error(`Front-matter invalid: ${file}`)
    console.error(e.stderr?.toString() || e.message)
  } finally {
    fs.rmSync(tmp, { force: true })
  }
}
process.exit(ok ? 0 : 1)
```

### 6) `package.json` scripts

- Merge the following keys into the root `package.json` `"scripts"` without removing existing ones:

```json
{
  "validate:quantapilot": "node scripts/validate-quantapilot.mjs",
  "validate:api": "npx ajv validate -s _schemas/api.schema.json -d _schemas/api.examples.json -c ajv-formats --spec=draft2020 || true",
  "docs:lint": "node scripts/docs-lint.mjs",
  "schema:all": "pnpm run validate:quantapilot && pnpm run docs:lint"
}
```

### 7) CI integration (GitHub Actions)

- Find primary workflow under `.github/workflows/*.yml`.
- Add a job step **after install** to run the schema checks, without duplicating existing jobs:

```yaml
- name: Schema checks
  run: pnpm run schema:all
```

- If no workflow exists, create `.github/workflows/ci.yml` with a minimal Node 22 job that installs deps and runs `schema:all`.

### 8) .gitignore tweak

- Ensure temporary `.tmp.*` files are ignored. If `.gitignore` exists, append:

```
.tmp.*
```

### 9) Sanity run (locally)

Run:

```bash
pnpm i
pnpm run validate:quantapilot
pnpm run docs:lint
pnpm run validate:api
```

All must pass.

### 10) Commit

- Create a branch and commit minimal diffs:

```bash
git checkout -b chore/schemas-and-docs-lint
git add -A
git commit -m "build(schemas): add quantapilot schema & docs lint; chore(ci): run schema checks"
git push -u origin chore/schemas-and-docs-lint
```

**Acceptance**

- `pnpm run schema:all` passes in CI and locally.
- `quantapilot.schema.json` contains required sections and does not break existing keys.
- `docs/*.md` front-matter validates.
- API schema and example validate.

---
