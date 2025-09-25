# Cage Installation Guide

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

## Installation Methods

### 1. Global Installation from npm (When Published)

Once published to npm, users will be able to install globally:

```bash
npm install -g @cage/cli
```

Or using yarn:

```bash
yarn global add @cage/cli
```

### 2. Local Development Installation

For development or testing before publishing:

#### Option A: Using the install script

```bash
# Clone the repository
git clone https://github.com/sengac/cage.git
cd cage

# Run the installation script
npm run install:local
```

#### Option B: Manual installation

```bash
# Clone the repository
git clone https://github.com/sengac/cage.git
cd cage

# Install dependencies
npm install

# Build all packages
npm run build

# Link the CLI globally
cd packages/cli
npm link
```

### 3. Direct Installation from GitHub

You can also install directly from the GitHub repository:

```bash
npm install -g github:sengac/cage#main
```

## Verification

After installation, verify that Cage is installed correctly:

```bash
# Check version
cage --version

# View help
cage --help

# Check available commands
cage hooks --help
cage events --help
```

## Using Cage in Your Project

### 1. Initialize Cage

Navigate to your project directory and run:

```bash
cage init
```

This will:

- Create a `.cage` directory for storing events
- Generate a `cage.config.json` configuration file
- Set up necessary directory structures

### 2. Set Up Claude Code Hooks

Configure Claude Code to use Cage hooks:

```bash
cage hooks setup
```

This will:

- Detect your Claude Code installation
- Update Claude Code's `settings.json` with hook configurations
- Install hook handlers for all 10 hook types

### 3. Start the Backend Server

Start the Cage backend server to capture events:

```bash
cage start
```

Or run in the background:

```bash
cage start --daemon
```

### 4. Verify Hook Installation

Check that hooks are properly configured:

```bash
cage hooks status
```

## Uninstallation

### Global Package

```bash
npm uninstall -g @cage/cli
```

### Local Development Link

```bash
npm unlink -g @cage/cli
```

## Publishing to npm (Maintainers Only)

### 1. Prepare for Publishing

```bash
# Ensure all tests pass
npm run check

# Build all packages
npm run build

# Test the publish (dry run)
npm run publish:dry-run
```

### 2. Publish to npm

```bash
# Login to npm (if not already logged in)
npm login

# Publish the package
npm run publish:cli
```

### 3. Version Management

Before publishing a new version:

```bash
# Update version in packages/cli/package.json
cd packages/cli

# For patch release (0.0.1 -> 0.0.2)
npm version patch

# For minor release (0.0.1 -> 0.1.0)
npm version minor

# For major release (0.0.1 -> 1.0.0)
npm version major

# Then publish
npm publish
```

## Troubleshooting

### Command Not Found

If `cage` command is not found after installation:

1. Check npm global installation path:

   ```bash
   npm config get prefix
   ```

2. Ensure the npm global bin directory is in your PATH:

   ```bash
   export PATH="$(npm config get prefix)/bin:$PATH"
   ```

3. Add this to your shell configuration file (`~/.bashrc`, `~/.zshrc`, etc.)

### Permission Errors

If you encounter permission errors during global installation:

```bash
# Use npx to avoid global installation
npx @cage/cli --version

# Or configure npm to use a different directory
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

### Build Errors

If the build fails:

```bash
# Clean and rebuild
rm -rf packages/*/dist
rm -rf node_modules
npm install
npm run build
```

## Support

- Documentation: https://cage.tools
- GitHub Issues: https://github.com/sengac/cage/issues
- Repository: https://github.com/sengac/cage
