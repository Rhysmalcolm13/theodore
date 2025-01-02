# MCP Server Integration

## Feature Overview
The Model Context Protocol (MCP) server integration enables communication between the extension and locally running MCP servers, providing additional tools and resources to extend the assistant's capabilities.

## Native Default Servers
Theodore comes with built-in MCP servers that enhance the assistant's capabilities:
- Server definitions: `/resources/mcp-servers/`
- Server implementations: `/src/services/mcp/default-servers/`

### Built-in Servers

1. **Context Manager** (`theodore-mcp-context-manager`)
   - Manages code context and caching for efficient operations
   - Located in `/resources/mcp-servers/context-manager/`
   - Implementation: `/src/services/mcp/default-servers/context-manager/`
   - Enabled by default
   - Version: 1.0.0

2. **Code Analyzer** (`theodore-mcp-code-analyzer`)
   - Analyzes code structure and dependencies
   - Located in `/resources/mcp-servers/code-analyzer/`
   - Implementation: `/src/services/mcp/default-servers/code-analyzer/`
   - Enabled by default
   - Version: 1.0.0

3. **File Watcher** (`theodore-mcp-file-watcher`)
   - Monitors file system changes and maintains cache consistency
   - Located in `/resources/mcp-servers/file-watcher/`
   - Enabled by default
   - Version: 1.0.0

### Server Architecture
- Servers are managed by `McpHub` and `ServerManager`
- Communication handled by `ServerCommunication`
- Configuration defined in `/src/services/mcp/default-servers/config.ts`

### Auto-Configuration
- Default servers are built-in and automatically configured
- Each server has:
  * Unique command for execution
  * Version tracking
  * Default enabled state
  * Built-in flag for core functionality

### Extending Default Servers
Users can extend default servers by:
1. Adding new tool definitions to `/resources/mcp-servers/[server-name]/tools/`
2. Implementing tool logic in `/src/services/mcp/default-servers/[server-name]/`
3. Updating server configuration in `config.ts`

## Implementation Details

### Core Components
1. **McpView Component**
   - Displays list of available MCP servers with status indicators
   - Shows server details including tools and resources
   - Supports expanding/collapsing server information
   - Implements global "Always allow MCP server access" toggle

2. **McpToolRow Component**
   - Displays individual tool information
   - Shows tool parameters and requirements
   - Implements per-tool "Always allow" toggle when global access is enabled
   - Renders tool input schema details

3. **State Management**
   - Added MCP-related state in ExtensionStateContext
   - Tracks server status, configurations, and permissions
   - Manages server list and tool permissions

### Message Types
- `alwaysAllowMcp`: Toggle global MCP server access
- `toggleToolAlwaysAllow`: Toggle individual tool permissions
- `mcpServers`: Update server list and status

## User Guide

### Accessing MCP Servers
1. Click the MCP button in the extension toolbar
2. View available servers and their status (connected, error, connecting)
3. Click on a server to expand its details

### Managing Permissions
1. **Global Access**
   - Use the "Always allow MCP server access" checkbox to enable/disable all MCP functionality
   
2. **Per-Tool Permissions**
   - When global access is enabled, each tool has an "Always allow" checkbox
   - Toggle individual tools to grant/revoke persistent access

### Using MCP Tools
- Expand a server to view available tools
- Each tool displays:
  - Name and description
  - Required parameters
  - Return type information

### Server Status Indicators
- 🟢 Green: Connected and ready
- 🟡 Yellow: Connecting
- 🔴 Red: Error or disabled

## Configuration
- Server configurations are managed in the extension settings
- Default server states can be configured via `defaultMcpServersEnabled`
- Individual server settings include:
  - Disabled state
  - Always allow flags
  - Custom configurations

## Note
MCP servers must be running locally for the extension to connect and utilize their functionality. Refer to the MCP server documentation for setup and configuration details. 