# Context Manager MCP Server

A Model Context Protocol (MCP) server that manages code context for the Theodore extension. This server maintains a history of code context and provides tools for updating and retrieving context information.

## Features

- Maintains a history of code context with file paths and timestamps
- Automatically manages context storage with a maximum entry limit
- Provides persistent storage of context data
- Exposes MCP tools for context management
- Implements MCP resources for context access

## Tools

### get-context

Retrieves the current code context.

**Parameters:** None

**Returns:** String containing the formatted context information.

### update-context

Updates the code context with new information.

**Parameters:**
- `content` (string): The content to add to the context
- `path` (string): The file path associated with the content

**Returns:** Success message

## Resources

### context://current

Provides access to the current context as a readable resource.

## Development

### Setup

```bash
# Install dependencies
npm install

# Build the server
npm run build

# Run tests
npm test

# Start the server
npm start
```

### Testing

The server includes a comprehensive test suite using Jest. Run the tests with:

```bash
npm test
```

Coverage reports will be generated in the `coverage` directory.

### Building

Build the TypeScript code with:

```bash
npm run build
```

The compiled code will be output to the `dist` directory.

## Integration

This server is designed to work with the Theodore extension and implements the Model Context Protocol. It can be configured in the Theodore settings under the `mcpServers` section.

Example configuration:

```json
{
  "mcpServers": {
    "context-manager": {
      "command": "theodore-mcp-context-manager",
      "disabled": false
    }
  }
}
``` 