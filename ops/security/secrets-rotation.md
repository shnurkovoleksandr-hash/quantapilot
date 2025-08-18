---
id: 'secrets-rotation'
title: 'Secrets Rotation Policy'
status: 'draft'
version: '0.1.0'
updated: '2025-08-18'
owners: ['@security', '@ops']
---

## Purpose

Политика ротации секретов для обеспечения безопасности QuantaPilot.

## Scope

Все секреты, используемые в системе:

- API ключи
- Токены доступа
- Пароли базы данных
- SSH ключи
- Сертификаты

## Rotation Schedule

### Critical Secrets (30 days)

- OpenAI API keys
- External service API keys
- Authentication tokens
- SSH keys for production

### Standard Secrets (90 days)

- Telegram bot tokens
- GitHub App private keys
- Database passwords
- TLS certificates
- Internal API keys

### Long-term Secrets (180 days)

- SOPS/age keys
- Database credentials
- Root certificates
- Backup keys

## Dual-Secret Rotation Process

### Schedule

- **OpenAI**: 30 days
- **Telegram**: 90 days
- **GitHub App private key**: 90 days
- **SOPS/age**: 180 days
- **Database**: 180 days

### Steps

1. Issue new secret (v2)
2. Add as `KEY_v2` (keep existing `KEY` as v1)
3. Update env/n8n to accept both v1|v2
4. Switch to v2
5. Monitor for 24 hours
6. Revoke v1
7. Create PR removing `*_v1` from SOPS

## Process

### Automated Rotation

1. Система автоматически генерирует новые секреты
2. Обновляет конфигурации без downtime
3. Валидирует работоспособность
4. Удаляет старые секреты после grace period

### Manual Rotation

1. Создание новых секретов
2. Обновление конфигураций
3. Тестирование в staging
4. Развертывание в production
5. Валидация работоспособности
6. Удаление старых секретов

## Monitoring

- Алерты на приближающуюся ротацию
- Уведомления об успешной/неуспешной ротации
- Логирование всех операций с секретами

## Emergency Procedures

- Процедуры экстренной ротации при компрометации
- Rollback процедуры
- Контакты для экстренных ситуаций
