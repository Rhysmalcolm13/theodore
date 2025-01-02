import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { ContextManager } from "./manager";
import * as path from "path";

class ContextManagerServer {
  private server: Server;
  private manager: ContextManager;

  constructor() {
    this.server = new Server(
      {
        name: "context-manager",
        version: "1.0.0"
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.manager = new ContextManager();
    this.setupRequestHandlers();
  }

  private setupRequestHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "get-context",
            description: "Get the current context",
            parameters: {
              type: "object",
              properties: {
                maxEntries: { type: "number" }
              }
            }
          },
          {
            name: "update-context",
            description: "Update the context with new information",
            parameters: {
              type: "object",
              properties: {
                content: { type: "string" },
                source: { type: "string" },
                timestamp: { type: "number" }
              },
              required: ["content", "source"]
            }
          },
          {
            name: "clear-context",
            description: "Clear all context entries",
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
        case "get-context": {
          const { maxEntries } = (args || {}) as { maxEntries?: number };
          const context = await this.manager.getContext(maxEntries);
          return {
            result: context
          };
        }

        case "update-context": {
          if (!args || typeof args !== "object") {
            throw new Error("Invalid arguments for update-context");
          }

          const { content, source, timestamp = Date.now() } = args as {
            content: string;
            source: string;
            timestamp?: number;
          };

          await this.manager.updateContext({
            content,
            source,
            timestamp
          });

          return {
            result: "Context updated successfully"
          };
        }

        case "clear-context": {
          await this.manager.clearContext();
          return {
            result: "Context cleared successfully"
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Context Manager MCP server running on stdio");
  }
}

// Start the server
const server = new ContextManagerServer();
server.start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
}); 