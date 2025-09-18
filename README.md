```
 ██████╗ █████╗  ██████╗ ███████╗
██╔════╝██╔══██╗██╔════╝ ██╔════╝
██║     ███████║██║  ███╗█████╗
██║     ██╔══██║██║   ██║██╔══╝
╚██████╗██║  ██║╚██████╔╝███████╗
 ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝

Control • Analyze • Guide • Execute
```

**A controlled environment for AI development**

🌐 **Website**: [https://cage.tools](https://cage.tools)
📦 **Repository**: [https://github.com/sengac/cage](https://github.com/sengac/cage)

## Documentation

- [CLI Documentation](docs/CLI.md)
- [Backend Documentation](docs/BACKEND.md)
- [Frontend Documentation](docs/FRONTEND.md)
- [Hooks Documentation](docs/HOOKS.md)
- [Docker Setup](docs/DOCKER.md)
- [Development Guide](docs/DEVELOPMENT.md)

## Quick Start

```bash
# Install all workspace dependencies
npm install

# Build all packages
npm run build

# Run CLI
npm run cage

# Start backend server
npm run start:server

# Development mode (all packages)
npm run dev

# Run tests in all workspaces
npm run test

# Run specific workspace commands
npm run dev --workspace @cage/frontend
npm run build --workspace @cage/cli
```

## License

MIT