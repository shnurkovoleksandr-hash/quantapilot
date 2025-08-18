# QuantaPilot Secrets Management Setup Guide

## Overview

This guide walks through the complete setup of QuantaPilot's secrets management system using SOPS/age encryption.

## Prerequisites

### Required Software

1. **SOPS**: `brew install sops` (macOS) or `sudo apt install sops` (Ubuntu)
2. **age**: `brew install age` (macOS) or `sudo apt install age` (Ubuntu)
3. **direnv**: `brew install direnv` (macOS) or `sudo apt install direnv` (Ubuntu)

### GitHub Repository Setup

1. **Repository Secrets**: Access to add GitHub repository secrets
2. **Branch Protection**: Ability to configure branch protection rules

## Step-by-Step Setup

### 1. Local Environment Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd QuantaPilot

# Run the automated setup script
./scripts/setup-env.sh

# Enable direnv
direnv allow
```

### 2. CI/CD Setup

```bash
# Generate CI keys
./scripts/setup-ci-keys.sh

# Follow the instructions to:
# 1. Add CI public key to .sops.yaml
# 2. Add CI private key to GitHub Secrets
```

### 3. Manual CI Key Configuration

#### Add CI Public Key to .sops.yaml

Update `.sops.yaml` to include both local and CI keys:

```yaml
# .sops.yaml
creation_rules:
  - path_regex: '(^|/)\.env(\..+)?$|(^|/)\.env\.sops$'
    age:
      - age1ca4lzlnvd93wtdr250ru94sangcsss5p46r7662gppmx2v6ufaaqc6tujw # Local key
      - age1xvu5uq848qn88t8qh3j7wwfweh38t7mwl4zgzznkc5rt2y78lseq524wcd # CI key
```

#### Add CI Private Key to GitHub Secrets

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Create new repository secret: `SOPS_AGE_KEY`
4. Copy the content of `ci-key.txt`

### 4. Test the Setup

#### Local Testing

```bash
# Test decryption
sops -d --input-type dotenv --output-type dotenv .env.sops

# Test direnv
direnv reload
echo $NODE_ENV
```

#### CI Testing

1. Commit and push your changes
2. Check the GitHub Actions workflow: `.github/workflows/test-sops.yml`
3. Verify that CI can decrypt `.env.sops`

### 5. n8n RBAC Implementation

#### Configure n8n Credentials

1. **GitHub App Credentials**:
   - Name: `gh_app_dev_writer`
   - Variables: `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY_B64`

2. **Telegram Bot Credentials**:
   - Name: `tg_ops_notify`
   - Variables: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

3. **OpenAI Credentials**:
   - Name: `llm_dev_writer` / `llm_qa`
   - Variables: `OPENAI_API_KEY`, `OPENAI_BASE_URL`

#### Enable Owner-based Access Control

1. In n8n settings, enable Owner-based access control
2. Prohibit credential sharing between flows
3. Map credentials to specific user roles

## Verification Checklist

### Local Environment

- [ ] SOPS and age installed
- [ ] `.env.sops` file exists and is encrypted
- [ ] `direnv allow` executed successfully
- [ ] Environment variables load correctly
- [ ] Decryption works: `sops -d .env.sops`

### CI/CD Environment

- [ ] CI keys generated
- [ ] CI public key added to `.sops.yaml`
- [ ] CI private key added to GitHub Secrets
- [ ] GitHub Actions workflow passes
- [ ] CI can decrypt `.env.sops`

### Security

- [ ] `.env` file not committed to repository
- [ ] `.envrc` file committed (safe to commit)
- [ ] `.sops.yaml` committed with public keys only
- [ ] CI private key stored securely in GitHub Secrets
- [ ] Branch protection enabled

## Troubleshooting

### Common Issues

1. **SOPS Decryption Fails**

   ```bash
   # Check age key file
   ls -la ~/.config/sops/age/keys.txt

   # Test key
   age-keygen -y ~/.config/sops/age/keys.txt
   ```

2. **direnv Not Loading**

   ```bash
   # Check .envrc permissions
   ls -la .envrc

   # Reload direnv
   direnv reload
   ```

3. **CI Decryption Fails**
   - Verify `SOPS_AGE_KEY` secret is set correctly
   - Check that CI public key is in `.sops.yaml`
   - Ensure `.env.sops` was encrypted with both keys

### Debug Commands

```bash
# Test SOPS installation
sops --version

# Test age installation
age --version

# Test key file
cat ~/.config/sops/age/keys.txt

# Test decryption manually
sops -d --input-type dotenv --output-type dotenv .env.sops

# Test environment variables
direnv reload && echo $NODE_ENV
```

## Security Best Practices

### Key Management

- **Rotate Keys**: Follow the schedule in `ops/security/secrets-rotation.md`
- **Separate Environments**: Use different keys for dev/staging/prod
- **Access Control**: Limit who can access private keys

### File Management

- **Never Commit**: Unencrypted `.env` files
- **Always Encrypt**: All sensitive configuration
- **Audit Trail**: Log all decryption operations

### CI/CD Security

- **Secret Scanning**: Enable GitHub secret scanning
- **Branch Protection**: Protect main branch
- **Least Privilege**: Use minimal required permissions

## Maintenance

### Regular Tasks

- **Monthly**: Review audit logs
- **Quarterly**: Rotate secrets according to schedule
- **Semi-annually**: Rotate age keys
- **Annually**: Review security policies

### Emergency Procedures

- **Secret Compromise**: Follow emergency rotation procedures
- **Key Loss**: Use backup keys and regenerate
- **CI Failure**: Check SOPS configuration and key availability

## Support

For issues or questions:

1. Check this guide and related documentation
2. Review `ops/README.md` for operations overview
3. Check `ops/security/secrets-rotation.md` for rotation procedures
4. Contact the operations team for assistance
