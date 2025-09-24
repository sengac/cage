```
 ██████╗ █████╗  ██████╗ ███████╗
██╔════╝██╔══██╗██╔════╝ ██╔════╝
██║     ███████║██║  ███╗█████╗
██║     ██╔══██║██║   ██║██╔══╝
╚██████╗██║  ██║╚██████╔╝███████╗
 ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝

Code Alignment Guard Engine
```

**An AI coding orchestrator that helps to enforce code quality and prevent code drift**

🌐 **Website**: [https://cage.tools](https://cage.tools)
📦 **Repository**: [https://github.com/sengac/cage](https://github.com/sengac/cage)

## Purpose

Cage addresses the critical challenge of maintaining code quality and architectural integrity when working with AI coding assistants. As AI tools become increasingly capable, they often lack real-time quality control and contextual awareness, leading to progressively degrading code quality during extended sessions. They don't self-monitor for anti-patterns, fail to recognize when files need refactoring, and drift toward quick fixes rather than maintaining proper architecture.

Cage acts as an intelligent middleware layer that provides boundaries, context, and guidance to ensure AI produces code that matches living specifications. It captures and analyzes every action the AI takes, enforces coding standards in real-time, and maintains a comprehensive event history for debugging and analysis. The system transforms the AI coding experience from one requiring constant vigilance to a truly collaborative partnership where developers can trust the AI to maintain their project's standards and architectural decisions.

Currently, Cage supports [Claude Code](https://claude.ai/code) through its comprehensive hooks API, capturing all tool interactions (file edits, command execution, etc.) for analysis and control. Future versions will extend support to other AI coding assistants, creating a universal quality control layer for AI-assisted development.

## Documentation

- [CLI Documentation](docs/CLI.md)
- [Backend Documentation](docs/BACKEND.md)
- [Frontend Documentation](docs/FRONTEND.md)
- [Hooks Documentation](docs/HOOKS.md)
- [Docker Setup](docs/DOCKER.md)
- [Development Guide](docs/DEVELOPMENT.md)

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/sengac/cage.git
cd cage

# Install dependencies
npm install

# Install cage command locally (also builds)
npm run install:local
```

### Basic Usage

```bash
# Initialize Cage in your project
cage init

# Set up Claude Code hooks
cage hooks setup

# Start the Cage server
cage start

# Launch interactive TUI
cage

# View server status
cage status

# Stream events in real-time
cage events stream

# View recent events
cage events tail
```

### Development

```bash
# Run in development mode
npm run dev

# Run tests
npm run test

# Check code quality
npm run check

# Run specific workspace commands
npm run dev --workspace @cage/cli
npm run build --workspace @cage/backend
```

## License

MIT