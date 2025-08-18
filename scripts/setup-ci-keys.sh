#!/bin/bash

# QuantaPilot CI Keys Setup Script
# This script helps generate and configure CI keys for GitHub Actions

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🔑 QuantaPilot CI Keys Setup"
echo "============================"

# Check if age is installed
if ! command -v age-keygen &> /dev/null; then
    echo "❌ age is not installed. Please install it first:"
    echo "   https://github.com/FiloSottile/age#installation"
    exit 1
fi

cd "$PROJECT_ROOT"

# Generate CI key pair
echo "🔐 Generating CI age key pair..."
age-keygen -o ci-key.txt

# Extract public key
echo "📋 Extracting public key..."
age-keygen -y ci-key.txt > ci-key.pub

echo ""
echo "✅ CI keys generated successfully!"
echo ""
echo "📁 Generated files:"
echo "   - ci-key.txt (private key - keep secure)"
echo "   - ci-key.pub (public key - add to .sops.yaml)"
echo ""

# Show the public key
echo "🔑 CI Public Key:"
echo "=================="
cat ci-key.pub
echo ""

echo "📝 Next steps:"
echo ""
echo "1. Add the CI public key to .sops.yaml:"
echo "   - Open .sops.yaml"
echo "   - Add the public key to the age array for each rule"
echo "   - Example:"
echo "     age:"
echo "       - 'age1ca4lzlnvd93wtdr250ru94sangcsss5p46r7662gppmx2v6ufaaqc6tujw'  # Your local key"
echo "       - '$(cat ci-key.pub)'  # CI public key"
echo ""
echo "2. Add the private key to GitHub Secrets:"
echo "   - Go to your GitHub repository"
echo "   - Settings → Secrets and variables → Actions"
echo "   - Create new repository secret: SOPS_AGE_KEY"
echo "   - Copy the content of ci-key.txt"
echo ""
echo "3. Test the setup:"
echo "   - Commit and push the updated .sops.yaml"
echo "   - Check that CI can decrypt .env.sops"
echo ""
echo "⚠️  Security Notes:"
echo "   - Keep ci-key.txt secure and never commit it"
echo "   - Rotate CI keys every 180 days"
echo "   - Use different keys for different environments"
echo ""
echo "🗑️  Clean up:"
echo "   - After adding to GitHub Secrets, you can delete ci-key.txt"
echo "   - Keep ci-key.pub for reference"
