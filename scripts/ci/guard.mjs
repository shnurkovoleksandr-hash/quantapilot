#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

// Policy configuration
const PROTECTED_PATHS = [
  '^.github/workflows/',
  '^ops/',
  '^contracts/',
  '^db/migrations/',
  '^infra/',
  '^Dockerfile',
  '^docker/',
  '^package(-lock)?\\.json',
]

const AGENT_DENYLIST = [
  '^.github/workflows/',
  '^ops/',
  '^contracts/',
  '^db/migrations/',
  '^infra/',
  '^Dockerfile',
  '^docker/',
]

function validateChanges(changedFiles, actor) {
  console.log('🔍 Validating changes...')
  console.log(`Actor: ${actor}`)
  console.log(`Changed files: ${changedFiles.length}`)

  const protectedViolations = []
  const agentViolations = []

  for (const file of changedFiles) {
    // Check protected paths
    for (const pattern of PROTECTED_PATHS) {
      if (new RegExp(pattern).test(file)) {
        protectedViolations.push({ file, pattern })
      }
    }

    // Check agent denylist
    if (actor === 'quantapilot-bot') {
      for (const pattern of AGENT_DENYLIST) {
        if (new RegExp(pattern).test(file)) {
          agentViolations.push({ file, pattern })
        }
      }
    }
  }

  // Report violations
  if (protectedViolations.length > 0) {
    console.log('❌ Protected path violations:')
    protectedViolations.forEach((v) => {
      console.log(`  - ${v.file} matches pattern: ${v.pattern}`)
    })
  }

  if (agentViolations.length > 0) {
    console.log('❌ Agent denylist violations:')
    agentViolations.forEach((v) => {
      console.log(`  - ${v.file} matches pattern: ${v.pattern}`)
    })
    console.log('Bot cannot modify protected infrastructure files')
    process.exit(1)
  }

  if (protectedViolations.length === 0 && agentViolations.length === 0) {
    console.log('✅ All changes comply with policy')
  }

  return { protectedViolations, agentViolations }
}

// Main execution
const changedFiles = process.argv.slice(2)
const actor = process.env.GITHUB_ACTOR || 'unknown'

if (changedFiles.length === 0) {
  console.log('No files changed')
  process.exit(0)
}

validateChanges(changedFiles, actor)

export { validateChanges }
