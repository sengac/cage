# @cage/cli

CLI tool for Cage - A controlled environment for AI development.

## Installation

### Global Installation (Recommended)

```bash
npm install -g @cage/cli
```

After installation, the `cage` command will be available globally:

```bash
cage --version
cage --help
```

### Local Development Installation

From the root of the cage repository:

```bash
# Build the project first
npm run build

# Link the CLI globally for development
cd packages/cli
npm link

# Now you can use 'cage' command anywhere
cage --version
```

To unlink:

```bash
npm unlink -g @cage/cli
```

## Usage

### Initialize Cage in your project

```bash
cage init
```

### Set up Claude Code hooks

```bash
cage hooks setup
```

### Check hook status

```bash
cage hooks status
```

### Start the backend server

```bash
cage server start
```

### View captured events

```bash
cage events list
cage events tail
cage events stats
```

## Requirements

- Node.js >= 18.0.0
- npm or yarn

## Documentation

Full documentation available at [https://cage.tools](https://cage.tools)

## License

MIT © Software Engineering & Consulting Pty Ltd
