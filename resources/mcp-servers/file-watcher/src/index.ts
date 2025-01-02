import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  NotificationSchema
} from "@modelcontextprotocol/sdk/types.js";
import { FileWatcher } from "./watcher";
import * as path from "path";

class FileWatcherServer {
  private server: Server;
  private watcher: FileWatcher;

  constructor() {
    this.server = new Server(
      {
        name: "file-watcher",
        version: "1.0.0"
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.watcher = new FileWatcher();
    this.setupRequestHandlers();
  }

  private setupRequestHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "watch-directory",
            description: "Watch a directory for file changes",
            parameters: {
              type: "object",
              properties: {
                path: { type: "string" },
                recursive: { type: "boolean" },
                exclude: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              required: ["path"]
            }
          },
          {
            name: "stop-watching",
            description: "Stop watching a directory",
            parameters: {
              type: "object",
              properties: {
                path: { type: "string" }
              },
              required: ["path"]
            }
          },
          {
            name: "list-watched",
            description: "List all watched directories",
            parameters: {
              type: "object",
              properties: {}
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { params } = request;
      const { name, arguments: args } = params;

      switch (name) {
        case "watch-directory": {
          if (!args || typeof args !== "object") {
            throw new Error("Invalid arguments for watch-directory");
          }

          const { path: dirPath, recursive = true, exclude = [] } = args as {
            path: string;
            recursive?: boolean;
            exclude?: string[];
          };

          const absolutePath = path.resolve(dirPath);
          await this.watcher.watchDirectory(absolutePath, {
            recursive,
            exclude: new Set(exclude)
          });

          return {
            result: `Now watching ${absolutePath}`
          };
        }

        case "stop-watching": {
          if (!args || typeof args !== "object") {
            throw new Error("Invalid arguments for stop-watching");
          }

          const { path: dirPath } = args as { path: string };
          const absolutePath = path.resolve(dirPath);
          await this.watcher.stopWatching(absolutePath);

          return {
            result: `Stopped watching ${absolutePath}`
          };
        }

        case "list-watched": {
          const watched = await this.watcher.listWatched();
          return {
            result: watched.join("\n")
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });

    // Handle file change events
    this.watcher.on("change", (event) => {
      this.server.notification({
        method: "file-change",
        params: {
          type: event.type,
          path: event.path,
          timestamp: event.timestamp
        }
      });
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("File Watcher MCP server running on stdio");
  }
}

// Start the server
const server = new FileWatcherServer();
server.start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
}); 