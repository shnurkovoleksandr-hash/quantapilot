#!/usr/bin/env node

import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import yaml from 'js-yaml'
import { Pool } from 'pg'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load SLO configuration
function loadSLOConfig() {
  const configPath = join(__dirname, '..', 'ops', 'slo.yml')
  const configContent = readFileSync(configPath, 'utf8')
  return yaml.load(configContent)
}

// Database connection
function createDBPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
  })
}

// Calculate error budget spent percentage
function calculateErrorBudgetSpent(successRate, targetRate) {
  const target = parseFloat(targetRate.replace('%', ''))
  const actual = parseFloat(successRate)
  const errorBudget = 100 - target
  const spent = target - actual
  return Math.max(0, (spent / errorBudget) * 100)
}

// Get SLI metrics from database
async function getSLIMetrics(pool, sliId, windowDays = 30) {
  const queryMap = {
    success_rate: `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'ok') * 100.0 / COUNT(*) as success_rate
      FROM runs 
      WHERE created_at >= NOW() - INTERVAL '${windowDays} days'
    `,
    e2e_lead_time_p95: `
      SELECT 
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY 
          EXTRACT(EPOCH FROM (updated_at - created_at)) / 60
        ) as e2e_lead_time_p95
      FROM runs 
      WHERE status = 'ok' 
        AND created_at >= NOW() - INTERVAL '${windowDays} days'
    `,
    cost_p95_usd: `
      SELECT 
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY cost_usd) as cost_p95_usd
      FROM runs 
      WHERE status = 'ok' 
        AND created_at >= NOW() - INTERVAL '${windowDays} days'
    `,
  }

  const query = queryMap[sliId]
  if (!query) {
    throw new Error(`Unknown SLI: ${sliId}`)
  }

  const result = await pool.query(query)
  return result.rows[0]
}

// Check SLO status for a task class
async function checkTaskClassSLO(pool, taskClass, config) {
  const results = {}
  const statuses = []

  for (const [metric, target] of Object.entries(taskClass.slo)) {
    const sliId = metric
    const metricData = await getSLIMetrics(
      pool,
      sliId,
      config.windows.reporting,
    )
    const value = metricData[Object.keys(metricData)[0]]

    results[metric] = { value, target }

    // Determine status based on target
    if (metric === 'success_rate') {
      const targetValue = parseFloat(target.replace('%', ''))
      const actualValue = parseFloat(value)

      if (actualValue >= targetValue) {
        statuses.push('OK')
      } else {
        const errorBudgetSpent = calculateErrorBudgetSpent(actualValue, target)
        if (errorBudgetSpent >= 100) {
          statuses.push('FREEZE')
        } else if (errorBudgetSpent >= 50) {
          statuses.push('WARN')
        } else {
          statuses.push('OK')
        }
      }
    } else {
      // For latency and cost metrics (lower is better)
      const targetValue = parseFloat(target.replace(/[^0-9.]/g, ''))
      const actualValue = parseFloat(value)

      if (actualValue <= targetValue) {
        statuses.push('OK')
      } else {
        statuses.push('WARN')
      }
    }
  }

  // Overall status is the worst status
  const overallStatus = statuses.includes('FREEZE')
    ? 'FREEZE'
    : statuses.includes('WARN')
      ? 'WARN'
      : 'OK'

  return {
    taskClass: taskClass.id,
    status: overallStatus,
    details: results,
    individualStatuses: statuses,
  }
}

// Send Telegram notification
async function sendTelegramNotification(status, config) {
  const chatId = process.env.TELEGRAM_CHAT_ID
  const botToken = process.env.TELEGRAM_BOT_TOKEN

  if (!chatId || !botToken) {
    console.warn('Telegram credentials not configured, skipping notification')
    return
  }

  const message = `🚨 SLO Status Update\n\n${status
    .map((s) => `${s.taskClass}: ${s.status}`)
    .join('\n')}`

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })

    if (!response.ok) {
      console.error(
        'Failed to send Telegram notification:',
        response.statusText,
      )
    }
  } catch (error) {
    console.error('Error sending Telegram notification:', error)
  }
}

// Main function
async function main() {
  try {
    const config = loadSLOConfig()
    const pool = createDBPool()

    console.log('🔍 Checking SLO status...\n')

    const results = []

    for (const taskClass of config.task_classes) {
      const result = await checkTaskClassSLO(pool, taskClass, config)
      results.push(result)

      console.log(`${result.taskClass}: ${result.status}`)
      for (const [metric, data] of Object.entries(result.details)) {
        console.log(`  ${metric}: ${data.value} (target: ${data.target})`)
      }
      console.log('')
    }

    // Check if any notifications should be sent
    const alertStatuses = results.filter((r) =>
      config.alerts.routes.some((route) =>
        route.on.includes(r.status.toLowerCase()),
      ),
    )

    if (alertStatuses.length > 0) {
      console.log('📢 Sending alerts...')
      await sendTelegramNotification(alertStatuses, config)
    }

    // Exit with error code if any FREEZE status
    const hasFreeze = results.some((r) => r.status === 'FREEZE')
    if (hasFreeze) {
      console.error('❌ SLO FREEZE status detected')
      process.exit(1)
    }

    const hasWarn = results.some((r) => r.status === 'WARN')
    if (hasWarn) {
      console.warn('⚠️  SLO WARN status detected')
      process.exit(0) // Non-blocking warning
    }

    console.log('✅ All SLOs within targets')
  } catch (error) {
    console.error('❌ SLO check failed:', error)
    process.exit(1)
  } finally {
    if (pool) {
      await pool.end()
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
