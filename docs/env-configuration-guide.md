# Environment Variables Configuration Guide

This guide will help you configure the `.env` file for QuantaPilot Stage 1.

## 📋 Required Environment Variables

### 1. Database Configuration

#### DB_PASSWORD
**Description**: Password for the PostgreSQL database user `quantapilot`
**How to set**: Choose a strong, secure password
**Example**: `DB_PASSWORD=mySecurePassword123!`

#### DATABASE_URL
**Description**: Full PostgreSQL connection string
**How to set**: Automatically constructed from DB_PASSWORD
**Example**: `DATABASE_URL=postgresql://quantapilot:mySecurePassword123!@localhost:5432/quantapilot`

### 2. Redis Configuration

#### REDIS_URL
**Description**: Redis connection string
**How to set**: Usually left as default for local development
**Example**: `REDIS_URL=redis://localhost:6379`

### 3. N8N Configuration

#### N8N_DB_PASSWORD
**Description**: Password for n8n's database user
**How to set**: Choose a different password from DB_PASSWORD
**Example**: `N8N_DB_PASSWORD=n8nSecurePassword456!`

#### N8N_ENCRYPTION_KEY
**Description**: 32-character encryption key for n8n
**How to generate**: Use a secure random string generator
**Example**: `N8N_ENCRYPTION_KEY=abcdef1234567890abcdef1234567890`

### 4. OpenAI Configuration

#### OPENAI_API_KEY
**Description**: Your OpenAI API key for AI functionality
**How to obtain**:
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to "API Keys" section
4. Click "Create new secret key"
5. Copy the generated key
**Example**: `OPENAI_API_KEY=sk-1234567890abcdef1234567890abcdef1234567890abcdef`

### 5. GitHub Configuration

#### GITHUB_TOKEN
**Description**: GitHub Personal Access Token for repository operations
**How to obtain**:
1. Go to [GitHub Settings](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select scopes:
   - `repo` (Full control of private repositories)
   - `workflow` (Update GitHub Action workflows)
   - `read:org` (Read organization data)
4. Generate and copy the token
**Example**: `GITHUB_TOKEN=ghp_1234567890abcdef1234567890abcdef12345678`

### 6. Telegram Configuration

#### TELEGRAM_BOT_TOKEN
**Description**: Telegram Bot API token for notifications
**How to obtain**:
1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` command
3. Follow the instructions to create a bot
4. Copy the provided token
**Example**: `TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`

### 7. Application Configuration

#### NODE_ENV
**Description**: Node.js environment
**How to set**: Use `development` for local development
**Example**: `NODE_ENV=development`

#### PORT
**Description**: Port for the backend API
**How to set**: Usually 3000 for development
**Example**: `PORT=3000`

#### LOG_LEVEL
**Description**: Logging level
**How to set**: Use `info` for development, `error` for production
**Example**: `LOG_LEVEL=info`

### 8. Security Configuration

#### JWT_SECRET
**Description**: Secret key for JWT token signing
**How to generate**: Use a secure random string
**Example**: `JWT_SECRET=myJWTSecretKey123!@#`

#### SESSION_SECRET
**Description**: Secret key for session management
**How to generate**: Use a secure random string
**Example**: `SESSION_SECRET=mySessionSecretKey456!@#`

## 🛠️ Quick Setup Commands

### Generate Secure Passwords and Keys

```bash
# Generate a secure password for database
openssl rand -base64 32

# Generate encryption key for n8n
openssl rand -hex 16

# Generate JWT secret
openssl rand -base64 32

# Generate session secret
openssl rand -base64 32
```

### Example .env Configuration

```bash
# Database Configuration
DB_PASSWORD=your_generated_password_here
DATABASE_URL=postgresql://quantapilot:your_generated_password_here@localhost:5432/quantapilot

# Redis Configuration
REDIS_URL=redis://localhost:6379

# N8N Configuration
N8N_DB_PASSWORD=your_n8n_password_here
N8N_ENCRYPTION_KEY=your_32_character_encryption_key_here

# OpenAI Configuration
OPENAI_API_KEY=sk-your_openai_api_key_here

# GitHub Configuration
GITHUB_TOKEN=ghp_your_github_token_here

# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Application Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Security
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
```

## 🔒 Security Best Practices

1. **Never commit .env files** to version control
2. **Use strong, unique passwords** for each service
3. **Rotate API keys regularly**
4. **Use environment-specific configurations**
5. **Limit API key permissions** to minimum required scope

## 🚀 Next Steps

After configuring your `.env` file:

1. **Test the configuration**:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

2. **Verify services are running**:
   ```bash
   curl http://localhost:3000/health
   ```

3. **Check logs for any errors**:
   ```bash
   docker-compose logs backend
   ```

## ❓ Troubleshooting

### Common Issues

1. **Database connection errors**: Check DB_PASSWORD and DATABASE_URL
2. **Port conflicts**: Ensure ports 3000, 5432, 6379, 5678 are available
3. **API key errors**: Verify API keys are correct and have proper permissions
4. **Permission errors**: Check file permissions on .env file

### Getting Help

- Check the logs: `docker-compose logs [service-name]`
- Verify environment variables: `docker-compose config`
- Test individual services: `docker-compose exec [service-name] [command]`
