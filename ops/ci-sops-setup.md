# SOPS Setup for CI/CD

## Overview

This document describes how to use SOPS for secret management in CI/CD environments, specifically GitHub Actions.

## GitHub Actions Setup

### Prerequisites

1. **SOPS AGE Key**: Generate an age key pair for CI
2. **GitHub Secrets**: Store the private key in GitHub repository secrets
3. **Public Key**: Add the public key to `.sops.yaml`

### Step 1: Generate AGE Key for CI

```bash
# Generate a new age key pair for CI
age-keygen -o ci-key.txt

# Extract public key
age-keygen -y ci-key.txt > ci-key.pub
```

### Step 2: Add Public Key to .sops.yaml

Add the CI public key to your `.sops.yaml`:

```yaml
creation_rules:
  - path_regex: '(^|/)\.env(\..+)?$|(^|/)\.env\.sops$'
    age:
      - 'age1ca4lzlnvd93wtdr250ru94sangcsss5p46r7662gppmx2v6ufaaqc6tujw' # Your local key
      - 'age1yourcipublickeyhere...' # CI public key
```

### Step 3: Store Private Key in GitHub Secrets

1. Copy the private key from `ci-key.txt`
2. Go to your GitHub repository → Settings → Secrets and variables → Actions
3. Create a new repository secret named `SOPS_AGE_KEY`
4. Paste the private key content

### Step 4: GitHub Actions Workflow

```yaml
name: CI with SOPS

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup SOPS
        run: |
          # Install SOPS
          curl -L https://github.com/mozilla/sops/releases/download/v3.7.3/sops-v3.7.3.linux.amd64 -o sops
          chmod +x sops
          sudo mv sops /usr/local/bin/

          # Install age
          curl -L https://github.com/FiloSottile/age/releases/download/v1.1.1/age-v1.1.1-linux-amd64.tar.gz -o age.tar.gz
          tar -xzf age.tar.gz
          sudo mv age/age /usr/local/bin/
          sudo mv age/age-keygen /usr/local/bin/

      - name: Setup AGE Key
        run: |
          # Create age key file from GitHub secret
          echo "${{ secrets.SOPS_AGE_KEY }}" > $RUNNER_TEMP/age.txt
          export SOPS_AGE_KEY_FILE="$RUNNER_TEMP/age.txt"

          # Test decryption
          if [[ -f ".env.sops" ]]; then
            sops -d .env.sops > .env
            echo "✅ Successfully decrypted .env.sops"
          fi

      - name: Run Tests
        run: |
          # Your test commands here
          npm test
```

## Security Best Practices

### Key Management

- **Separate Keys**: Use different age keys for different environments
- **Key Rotation**: Rotate CI keys regularly (every 180 days)
- **Access Control**: Limit who can access GitHub secrets

### File Management

- **Never Commit**: Never commit unencrypted `.env` files
- **Encrypt Everything**: Encrypt all sensitive configuration files
- **Audit Trail**: Log all decryption operations in CI

### Environment Isolation

- **Dev/Staging/Prod**: Use different keys for different environments
- **Branch Protection**: Protect main branch from unauthorized changes
- **Secret Scanning**: Enable GitHub secret scanning

## Troubleshooting

### Common Issues

1. **Decryption Fails**
   - Check that the private key matches the public key in `.sops.yaml`
   - Verify the key file format and permissions
   - Ensure SOPS and age are properly installed

2. **Permission Denied**
   - Check file permissions on the age key file
   - Verify GitHub secret is properly set
   - Ensure the workflow has access to secrets

3. **Key Not Found**
   - Verify the `SOPS_AGE_KEY_FILE` environment variable is set
   - Check that the key file exists and is readable
   - Ensure the key file path is correct

### Debug Commands

```bash
# Test SOPS installation
sops --version

# Test age installation
age --version

# Test key file
cat $SOPS_AGE_KEY_FILE

# Test decryption manually
sops -d .env.sops
```

## Migration Guide

### From Plain .env to SOPS

1. **Backup**: Create backup of current `.env` file
2. **Encrypt**: Use the setup script to create `.env.sops`
3. **Update CI**: Add SOPS setup to CI workflows
4. **Test**: Verify CI can decrypt and use secrets
5. **Remove**: Remove plain `.env` from repository

### From Other Secret Managers

1. **Export**: Export secrets from current system
2. **Format**: Convert to `.env` format
3. **Encrypt**: Use SOPS to encrypt
4. **Update**: Update CI and documentation
5. **Test**: Verify everything works correctly
