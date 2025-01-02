import { DefaultServerConfig } from "../types";

export const defaultServers: Record<string, DefaultServerConfig> = {
  "context-manager": {
    name: "context-manager",
    command: "theodore-mcp-context-manager",
    description: "Manages code context and caching for efficient operations",
    defaultEnabled: true,
    builtin: true,
    version: "1.0.0"
  },
  "code-analyzer": {
    name: "code-analyzer",
    command: "theodore-mcp-code-analyzer", 
    description: "Analyzes code structure and dependencies",
    defaultEnabled: true,
    builtin: true,
    version: "1.0.0"
  },
  "file-watcher": {
    name: "file-watcher",
    command: "theodore-mcp-file-watcher",
    description: "Monitors file system changes and maintains cache consistency",
    defaultEnabled: true,
    builtin: true,
    version: "1.0.0"
  }
}; 