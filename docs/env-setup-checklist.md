# Environment Variables Setup Checklist

## ✅ Completed (Auto-generated)
- [x] **DB_PASSWORD**: `3/PLc4eauxIOc8pOxE0v3g2o2D9mT6MyGuQOeeBylRQ=`
- [x] **DATABASE_URL**: Automatically configured
- [x] **REDIS_URL**: `redis://localhost:6379`
- [x] **N8N_DB_PASSWORD**: `2W7iCs77dvqTH54Q1K78MYmxKg3FxSB7XfDLRXRQRyE=`
- [x] **N8N_ENCRYPTION_KEY**: `3b0cc16b9f01d518fbd5c92017896291`
- [x] **JWT_SECRET**: `qbQ4urAsRddxZdcv2Y9RuoPkzvF/VjMb8tBa/Dm2CYg=`
- [x] **SESSION_SECRET**: `wzWqPzMRSMoTW6rI8ap5vkOBpgJ8qAWuB2cM/NXu2hc=`
- [x] **NODE_ENV**: `development`
- [x] **PORT**: `3000`
- [x] **LOG_LEVEL**: `info`

## 🔑 Required API Keys (Manual Setup)

### 1. OpenAI API Key
**Status**: ⏳ **PENDING**
**Steps to obtain**:
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to "API Keys" in the left sidebar
4. Click "Create new secret key"
5. Give it a name (e.g., "QuantaPilot")
6. Copy the generated key (starts with `sk-`)
7. Update `.env` file: `OPENAI_API_KEY=sk-your_key_here`

### 2. GitHub Personal Access Token
**Status**: ⏳ **PENDING**
**Steps to obtain**:
1. Go to [GitHub Settings > Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g., "QuantaPilot")
4. Set expiration (recommend 90 days)
5. Select these scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
   - ✅ `read:org` (Read organization data)
6. Click "Generate token"
7. Copy the token (starts with `ghp_`)
8. Update `.env` file: `GITHUB_TOKEN=ghp_your_token_here`

### 3. Telegram Bot Token
**Status**: ⏳ **PENDING**
**Steps to obtain**:
1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Start a chat with BotFather
3. Send `/newbot` command
4. Follow the instructions:
   - Enter a display name for your bot
   - Enter a username (must end with 'bot')
5. BotFather will provide a token
6. Copy the token (format: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)
7. Update `.env` file: `TELEGRAM_BOT_TOKEN=your_token_here`

## 🚀 Quick Commands

### Update .env file with your API keys:
```bash
# Replace these placeholders in your .env file:
# OPENAI_API_KEY=sk-your_openai_api_key_here
# GITHUB_TOKEN=ghp_your_github_token_here  
# TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
```

### Test configuration after updating:
```bash
# Restart services with new environment variables
docker-compose down
docker-compose up -d

# Test health endpoint
curl http://localhost:3000/health

# Check logs for any errors
docker-compose logs backend
```

## 🔒 Security Notes

- **Never commit your .env file** to version control
- **Keep your API keys secure** and don't share them
- **Rotate tokens regularly** (especially GitHub tokens)
- **Use environment-specific configurations** for production

## 📞 Need Help?

If you encounter issues:
1. Check the logs: `docker-compose logs [service-name]`
2. Verify environment variables: `docker-compose config`
3. Test individual services
4. Refer to the detailed configuration guide in `docs/env-configuration-guide.md`
