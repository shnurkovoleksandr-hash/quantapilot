import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import { execSync } from 'node:child_process'

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
  execSync(
    'npx ajv validate -s _schemas/quantapilot.schema.json -d ' +
      tmp +
      ' -c ajv-formats --spec=draft2020',
    { stdio: 'inherit' },
  )
} finally {
  fs.rmSync(tmp, { force: true })
}
