import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { glob } from 'glob'
import { execSync } from 'node:child_process'

const schema = '_schemas/frontmatter.schema.json'
const files = glob.sync('docs/*.md').filter((f) => !f.endsWith('README.md'))
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
    execSync(
      'npx ajv validate -s ' +
        schema +
        ' -d ' +
        tmp +
        ' -c ajv-formats --spec=draft2020',
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
