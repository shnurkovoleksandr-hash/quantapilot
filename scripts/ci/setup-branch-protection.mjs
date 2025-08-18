#!/usr/bin/env node

import { execSync } from 'node:child_process'

/**
 * Setup Branch Protection Rules for QuantaPilot
 * 
 * This script helps configure branch protection rules using GitHub CLI.
 * Run this script after setting up the required status checks.
 */

const BRANCH = 'main'
const REQUIRED_CHECKS = [
  'policy/enforcer',
  'docs-lint',
  'quality-gate',
  'security-scan'
]

function setupBranchProtection() {
  console.log('🔧 Setting up branch protection rules for QuantaPilot...')
  
  try {
    // Check if gh CLI is available
    execSync('gh --version', { stdio: 'pipe' })
  } catch (error) {
    console.error('❌ GitHub CLI (gh) is required but not installed')
    console.error('Install from: https://cli.github.com/')
    process.exit(1)
  }
  
  try {
    // Check authentication
    execSync('gh auth status', { stdio: 'pipe' })
  } catch (error) {
    console.error('❌ GitHub CLI not authenticated')
    console.error('Run: gh auth login')
    process.exit(1)
  }
  
  console.log(`📋 Configuring protection for branch: ${BRANCH}`)
  console.log(`🔍 Required status checks: ${REQUIRED_CHECKS.join(', ')}`)
  
  // Note: GitHub CLI doesn't directly support all branch protection settings
  // This script provides the commands to run manually
  console.log('\n📝 Manual Configuration Required:')
  console.log('1. Go to GitHub repository settings')
  console.log('2. Navigate to Settings > Branches')
  console.log('3. Add rule for branch: main')
  console.log('4. Configure the following settings:')
  
  console.log('\n✅ Required Status Checks:')
  REQUIRED_CHECKS.forEach(check => {
    console.log(`   - ${check}`)
  })
  
  console.log('\n✅ Additional Settings:')
  console.log('   - Require branches to be up to date before merging')
  console.log('   - Require pull request reviews before merging')
  console.log('   - Require review from code owners')
  console.log('   - Dismiss stale PR approvals when new commits are pushed')
  console.log('   - Require linear history')
  console.log('   - Require conversation resolution before merging')
  console.log('   - Restrict pushes that create files')
  console.log('   - Allow force pushes: Disabled')
  console.log('   - Allow deletions: Disabled')
  
  console.log('\n🎯 Protection Summary:')
  console.log(`- Branch: ${BRANCH}`)
  console.log(`- Required checks: ${REQUIRED_CHECKS.length}`)
  console.log('- Code owner reviews: Required')
  console.log('- Linear history: Required')
  console.log('- Force push: Disabled')
  
  console.log('\n✅ Branch protection configuration documented!')
  console.log('📄 See .github/branch-protection.yml for reference')
}

// Run if called directly
setupBranchProtection()

export { setupBranchProtection }
