#!/usr/bin/env node

/**
 * API Validation Script
 *
 * Validates that API schemas and payloads are PII-free.
 * This script is used in CI to enforce data protection policies.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// PII patterns to detect
const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /\b\d{3}-\d{3}-\d{4}\b/g,
  name: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
  apiToken: /\bghp_[a-zA-Z0-9]{36}\b/g,
  passport: /\b[A-Z]{2}\d{6,}\b/g,
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
}

// Forbidden field names that might contain PII
const FORBIDDEN_FIELDS = [
  'email',
  'user_email',
  'email_address',
  'phone',
  'phone_number',
  'telephone',
  'first_name',
  'last_name',
  'full_name',
  'user_name',
  'personal_name',
  'token',
  'api_token',
  'access_token',
  'auth_token',
  'password',
  'secret',
  'key',
  'ssn',
  'social_security',
  'passport',
  'address',
  'street',
  'city',
  'zip',
]

function validatePiiFree(content, filePath) {
  const errors = []

  // Check for PII patterns in content
  for (const [patternName, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = content.match(pattern)
    if (matches) {
      errors.push(
        `PII pattern '${patternName}' detected: ${matches.slice(0, 3).join(', ')}${matches.length > 3 ? '...' : ''}`,
      )
    }
  }

  // Check for forbidden field names
  for (const field of FORBIDDEN_FIELDS) {
    const fieldPattern = new RegExp(`"${field}"\\s*:`, 'gi')
    if (fieldPattern.test(content)) {
      errors.push(`Forbidden field name detected: '${field}'`)
    }
  }

  return errors
}

function validateSchema(schemaPath) {
  try {
    const schemaContent = readFileSync(schemaPath, 'utf8')
    const schema = JSON.parse(schemaContent)

    const errors = validatePiiFree(schemaContent, schemaPath)

    if (errors.length > 0) {
      console.error(`❌ Schema validation failed for ${schemaPath}:`)
      errors.forEach((error) => console.error(`  - ${error}`))
      return false
    }

    console.log(`✅ Schema ${schemaPath} is PII-free`)
    return true
  } catch (error) {
    console.error(`❌ Failed to validate schema ${schemaPath}:`, error.message)
    return false
  }
}

function validateExamples(examplesPath) {
  try {
    const examplesContent = readFileSync(examplesPath, 'utf8')
    const examples = JSON.parse(examplesContent)

    const errors = validatePiiFree(examplesContent, examplesPath)

    if (errors.length > 0) {
      console.error(`❌ Examples validation failed for ${examplesPath}:`)
      errors.forEach((error) => console.error(`  - ${error}`))
      return false
    }

    console.log(`✅ Examples ${examplesPath} are PII-free`)
    return true
  } catch (error) {
    console.error(
      `❌ Failed to validate examples ${examplesPath}:`,
      error.message,
    )
    return false
  }
}

function main() {
  const projectRoot = join(__dirname, '..')
  const schemasDir = join(projectRoot, '_schemas')

  console.log('🔍 Validating API schemas for PII-free compliance...\n')

  let allValid = true

  // Validate API schema
  const apiSchemaPath = join(schemasDir, 'api.schema.json')
  if (!validateSchema(apiSchemaPath)) {
    allValid = false
  }

  // Validate error schema
  const errorSchemaPath = join(schemasDir, 'error.schema.json')
  if (!validateSchema(errorSchemaPath)) {
    allValid = false
  }

  // Validate examples if they exist
  const examplesPath = join(schemasDir, 'api.examples.json')
  try {
    if (!validateExamples(examplesPath)) {
      allValid = false
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`ℹ️  Examples file not found: ${examplesPath}`)
    } else {
      console.error(`❌ Failed to validate examples: ${error.message}`)
      allValid = false
    }
  }

  console.log('\n' + '='.repeat(50))

  if (allValid) {
    console.log('✅ All API schemas and examples are PII-free compliant')
    process.exit(0)
  } else {
    console.log('❌ PII violations detected in API schemas')
    console.log(
      '\nPlease review and remove any PII from the schemas before deployment.',
    )
    process.exit(1)
  }
}

// Always run main when script is executed directly
main()
