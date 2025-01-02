# Theodore

Theodore is an autonomous coding agent built as a VSCode extension, featuring Model Context Protocol (MCP) integration for enhanced code understanding and manipulation.

## Features

- **Code Analysis**: Intelligent code analysis using the MCP code-analyzer server
- **Context Management**: Smart context tracking and management through the MCP context-manager server
- **File Watching**: Real-time file system monitoring via the MCP file-watcher server
- **Integrated Communication**: Seamless communication between MCP servers for coordinated functionality

## Architecture

The extension uses three main MCP servers:

1. **Context Manager**: Manages code context and caching for efficient operations
2. **Code Analyzer**: Analyzes code structure and dependencies
3. **File Watcher**: Monitors file system changes and maintains cache consistency

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/Theodore.git
   cd Theodore
   ```

2. Install dependencies:
   ```bash
   npm run install:all
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Install the VSIX:
   - In VSCode, go to Extensions
   - Click "..." (More Actions)
   - Select "Install from VSIX..."
   - Choose the generated VSIX file from the `bin` directory

## Development

1. Install dependencies:
   ```bash
   npm run install:all
   ```

2. Start the development server:
   ```bash
   npm run watch
   ```

3. Launch the extension in debug mode:
   - Press F5 in VSCode
   - A new VSCode window will open with the extension loaded

## Testing

Run all tests:
```bash
npm test
```

Run specific test suites:
```bash
npm run test:webview    # Run webview tests
```

## Building

Build the extension:
```bash
npm run build
```

This will:
1. Build the webview UI
2. Run type checking
3. Run linting
4. Bundle the extension
5. Create a VSIX package

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
