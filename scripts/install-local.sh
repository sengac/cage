#!/bin/bash

# Script to install cage CLI locally for development

set -e

echo "🔧 Installing Cage CLI locally..."

# Ensure we're in the project root
if [ ! -f "package.json" ] || [ ! -d "packages/cli" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build all packages
echo "🔨 Building packages..."
npm run build

# Make CLI executable
echo "🔑 Making CLI executable..."
chmod +x packages/cli/dist/index.js

# Link the CLI globally
echo "🔗 Linking CLI globally..."
cd packages/cli
npm link

echo "✅ Cage CLI installed successfully!"
echo ""
echo "You can now use the 'cage' command globally:"
echo "  cage --version"
echo "  cage --help"
echo ""
echo "To uninstall, run:"
echo "  npm unlink -g @cage/cli"