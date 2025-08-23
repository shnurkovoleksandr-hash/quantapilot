#!/bin/bash
# QuantaPilot™ Security Setup Script
# Generates secure secrets for production deployment

set -e

echo "🔐 QuantaPilot™ Security Setup"
echo "=============================="

# Function to generate a random password
generate_password() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Function to generate a hex secret
generate_hex_secret() {
    local length=${1:-64}
    openssl rand -hex $((length/2))
}

# Create secrets directory if it doesn't exist
mkdir -p secrets

echo "🔑 Generating secure secrets..."

# Generate JWT secret (minimum 32 characters)
JWT_SECRET=$(generate_password 64)
echo "JWT_SECRET=$JWT_SECRET" > secrets/jwt.secret

# Generate database passwords
POSTGRES_PASSWORD=$(generate_password 32)
N8N_POSTGRES_PASSWORD=$(generate_password 32)
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" > secrets/postgres.secret
echo "N8N_POSTGRES_PASSWORD=$N8N_POSTGRES_PASSWORD" >> secrets/postgres.secret

# Generate n8n admin password
N8N_ADMIN_PASSWORD=$(generate_password 16)
echo "N8N_BASIC_AUTH_PASSWORD=$N8N_ADMIN_PASSWORD" > secrets/n8n.secret

# Generate Grafana admin password
GRAFANA_ADMIN_PASSWORD=$(generate_password 16)
echo "GRAFANA_ADMIN_PASSWORD=$GRAFANA_ADMIN_PASSWORD" > secrets/grafana.secret

# Generate webhook secrets
GITHUB_WEBHOOK_SECRET=$(generate_hex_secret 64)
echo "GITHUB_WEBHOOK_SECRET=$GITHUB_WEBHOOK_SECRET" > secrets/webhooks.secret

# Generate session secrets
SESSION_SECRET=$(generate_hex_secret 64)
echo "SESSION_SECRET=$SESSION_SECRET" > secrets/session.secret

# Set proper permissions on secrets
chmod 600 secrets/*.secret

echo "✅ Secrets generated successfully!"
echo ""
echo "📋 Generated secrets:"
echo "   - JWT Secret: secrets/jwt.secret"
echo "   - Database Passwords: secrets/postgres.secret"
echo "   - n8n Admin Password: secrets/n8n.secret"
echo "   - Grafana Admin Password: secrets/grafana.secret"
echo "   - Webhook Secrets: secrets/webhooks.secret"
echo "   - Session Secret: secrets/session.secret"
echo ""
echo "⚠️  IMPORTANT:"
echo "   - Keep these secrets secure and never commit them to version control"
echo "   - Copy the values to your .env file or use Docker secrets"
echo "   - Rotate these secrets regularly in production"
echo ""
echo "🔐 You can view the generated secrets with:"
echo "   cat secrets/*.secret"
