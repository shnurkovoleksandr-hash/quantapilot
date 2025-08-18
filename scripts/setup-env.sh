#!/bin/bash

# QuantaPilot Environment Setup Script
# This script helps create and encrypt environment files

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🔐 QuantaPilot Environment Setup"
echo "================================"

# Check if SOPS is installed
if ! command -v sops &> /dev/null; then
    echo "❌ SOPS is not installed. Please install it first:"
    echo "   https://github.com/mozilla/sops#installation"
    exit 1
fi

# Check if age is installed
if ! command -v age &> /dev/null; then
    echo "❌ age is not installed. Please install it first:"
    echo "   https://github.com/FiloSottile/age#installation"
    exit 1
fi

# Check if .sops.yaml exists
if [[ ! -f "$PROJECT_ROOT/.sops.yaml" ]]; then
    echo "❌ .sops.yaml not found in project root"
    exit 1
fi

# Check if .env.example exists
if [[ ! -f "$PROJECT_ROOT/.env.example" ]]; then
    echo "❌ .env.example not found in project root"
    exit 1
fi

cd "$PROJECT_ROOT"

# Check if .env already exists
if [[ -f ".env" ]]; then
    echo "⚠️  .env file already exists"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

# Copy .env.example to .env
echo "📋 Creating .env from .env.example..."
cp .env.example .env

echo "✅ .env file created from .env.example"
echo ""
echo "📝 Please edit .env file with your actual values:"
echo "   $EDITOR .env"
echo ""
read -p "Press Enter when you've finished editing .env..."

# Check if .env.sops already exists
if [[ -f ".env.sops" ]]; then
    echo "⚠️  .env.sops file already exists"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Encryption cancelled. .env file remains unencrypted."
        exit 0
    fi
fi

# Encrypt .env to .env.sops
echo "🔒 Encrypting .env to .env.sops..."
sops -e --input-type dotenv --output-type dotenv .env > .env.sops

# Verify encryption worked
if [[ -f ".env.sops" ]]; then
    echo "✅ .env.sops created successfully"
    
    # Ask if user wants to remove .env
    read -p "Remove unencrypted .env file? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        rm .env
        echo "🗑️  .env file removed"
    fi
else
    echo "❌ Failed to create .env.sops"
    exit 1
fi

echo ""
echo "🎉 Environment setup complete!"
echo ""
echo "Next steps:"
echo "1. If using direnv, run: direnv allow"
echo "2. Verify decryption works: sops -d .env.sops"
echo "3. Check that .envrc is working correctly"
