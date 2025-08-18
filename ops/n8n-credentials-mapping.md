# n8n Credentials Mapping

## Overview

This document defines the mapping between n8n credentials and environment variables for QuantaPilot.

## Credential Types and Environment Variables

### GitHub App Credentials

**Credential Name**: `gh_app_dev_writer`

**Environment Variables**:

- `GITHUB_APP_ID` - GitHub App ID
- `GITHUB_APP_INSTALLATION_ID` - GitHub App Installation ID
- `GITHUB_APP_PRIVATE_KEY_B64` - Base64 encoded private key PEM

**Usage**: GitHub API operations, repository management, workflow triggers

### Telegram Bot Credentials

**Credential Name**: `tg_ops_notify`

**Environment Variables**:

- `TELEGRAM_BOT_TOKEN` - Telegram Bot API token
- `TELEGRAM_CHAT_ID` - Target chat ID for notifications

**Usage**: Operations notifications, alerts, status updates

### OpenAI LLM Credentials

**Credential Name**: `llm_dev_writer` / `llm_qa`

**Environment Variables**:

- `OPENAI_API_KEY` - OpenAI API key
- `OPENAI_BASE_URL` - OpenAI API base URL (for custom endpoints)

**Usage**: Code generation, analysis, documentation

## Access Control

### Owner-based Access Control

- Enable Owner-based access control in n8n
- Prohibit credential sharing between flows
- Each flow should use only its designated credentials

### RBAC Implementation

- Map credentials to specific user roles
- Implement least privilege principle
- Regular audit of credential usage

## Security Considerations

1. **Credential Rotation**: Follow the dual-secret rotation policy
2. **Environment Isolation**: Use different credentials for dev/staging/prod
3. **Audit Logging**: Log all credential usage and access attempts
4. **Encryption**: All credentials stored encrypted via SOPS/age

## Example n8n Configuration

```json
{
  "credentials": {
    "gh_app_dev_writer": {
      "id": "gh_app_dev_writer",
      "name": "GitHub App Dev Writer",
      "type": "githubApi",
      "data": {
        "appId": "{{ $env.GITHUB_APP_ID }}",
        "installationId": "{{ $env.GITHUB_APP_INSTALLATION_ID }}",
        "privateKey": "{{ $env.GITHUB_APP_PRIVATE_KEY_B64 | base64Decode }}"
      }
    },
    "tg_ops_notify": {
      "id": "tg_ops_notify",
      "name": "Telegram Ops Notify",
      "type": "telegramApi",
      "data": {
        "accessToken": "{{ $env.TELEGRAM_BOT_TOKEN }}",
        "chatId": "{{ $env.TELEGRAM_CHAT_ID }}"
      }
    },
    "llm_dev_writer": {
      "id": "llm_dev_writer",
      "name": "OpenAI Dev Writer",
      "type": "openAiApi",
      "data": {
        "apiKey": "{{ $env.OPENAI_API_KEY }}",
        "baseURL": "{{ $env.OPENAI_BASE_URL }}"
      }
    }
  }
}
```
