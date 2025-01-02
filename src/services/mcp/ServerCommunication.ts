import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { NotificationSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { McpConnection } from "./McpHub

// Event schemas for type safety
const FileChangeEventSchema = z.object({
  type: z.enum(["add", "change", "unlink"]),
  path: z.string(),
  timestamp: z.number()
});

const CodeAnalysisEventSchema = z.object({
  path: z.string(),
  analysis: z.object({
    imports: z.array(z.string()),
    exports: z.array(z.string()),
    functions: z.array(z.object({
      name: z.string(),
      params: z.array(z.string()),
      returnType: z.string().optional(),
      async: z.boolean(),
      generator: z.boolean()
    })),
    classes: z.array(z.object({
      name: z.string(),
      methods: z.array(z.object({
        name: z.string(),
        params: z.array(z.string()),
        returnType: z.string().optional(),
        async: z.boolean(),
        generator: z.boolean(),
        visibility: z.enum(["public", "private", "protected"]).optional()
      })),
      properties: z.array(z.object({
        name: z.string(),
        type: z.string().optional(),
        visibility: z.enum(["public", "private", "protected"]).optional()
      }))
    })),
    interfaces: z.array(z.object({
      name: z.string(),
      properties: z.array(z.object({
        name: z.string(),
        type: z.string(),
        optional: z.boolean()
      })),
      methods: z.array(z.object({
        name: z.string(),
        params: z.array(z.string()),
        returnType: z.string(),
        optional: z.boolean()
      }))
    }))
  })
});

const ContextUpdateEventSchema = z.object({
  content: z.string(),
  source: z.string(),
  timestamp: z.number()
});

type FileChangeEvent = z.infer<typeof FileChangeEventSchema>;
type CodeAnalysisEvent = z.infer<typeof CodeAnalysisEventSchema>;
type ContextUpdateEvent = z.infer<typeof ContextUpdateEventSchema>;

export class ServerCommunication {
  private connections: Map<string, McpConnection>;
  private analysisQueue: Set<string>;
  private contextUpdateQueue: Set<CodeAnalysisEvent>;

  constructor() {
    this.connections = new Map();
    this.analysisQueue = new Set();
    this.contextUpdateQueue = new Set();
  }

  registerConnection(serverId: string, connection: McpConnection) {
    this.connections.set(serverId, connection);

    // Set up event handlers based on server type
    switch (serverId) {
      case "file-watcher":
        this.setupFileWatcherEvents(connection.client);
        break;
      case "code-analyzer":
        this.setupCodeAnalyzerEvents(connection.client);
        break;
      case "context-manager":
        this.setupContextManagerEvents(connection.client);
        break;
    }
  }

  private async setupFileWatcherEvents(client: Client) {
    const handleFileChange = async (params: unknown) => {
      try {
        const event = FileChangeEventSchema.parse(params);
        if (event.type === "change" || event.type === "add") {
          await this.queueFileForAnalysis(event.path);
        }
      } catch (error) {
        console.error("Invalid file change event:", error);
      }
    };

    client.setNotificationHandler(NotificationSchema.extend({
      method: z.literal("file-change")
    }), handleFileChange);
  }

  private async setupCodeAnalyzerEvents(client: Client) {
    const handleAnalysisComplete = async (params: unknown) => {
      try {
        const event = CodeAnalysisEventSchema.parse(params);
        await this.queueContextUpdate(event);
      } catch (error) {
        console.error("Invalid analysis event:", error);
      }
    };

    client.setNotificationHandler(NotificationSchema.extend({
      method: z.literal("analysis-complete")
    }), handleAnalysisComplete);
  }

  private async setupContextManagerEvents(client: Client) {
    const handleContextUpdate = async (params: unknown) => {
      try {
        const event = ContextUpdateEventSchema.parse(params);
        // Context updates are terminal events, no further processing needed
      } catch (error) {
        console.error("Invalid context update event:", error);
      }
    };

    client.setNotificationHandler(NotificationSchema.extend({
      method: z.literal("context-updated")
    }), handleContextUpdate);
  }

  private async queueFileForAnalysis(filePath: string) {
    if (this.analysisQueue.has(filePath)) {
      return; // Already queued
    }

    this.analysisQueue.add(filePath);
    const analyzer = this.connections.get("code-analyzer");
    if (!analyzer) {
      console.error("Code analyzer not connected");
      return;
    }

    try {
      await analyzer.client.callTool({
        name: "analyze-file",
        arguments: { path: filePath }
      });
      this.analysisQueue.delete(filePath);
    } catch (error) {
      console.error(`Failed to analyze file ${filePath}:`, error);
      this.analysisQueue.delete(filePath);
    }
  }

  private async queueContextUpdate(analysis: CodeAnalysisEvent) {
    if (!analysis.path) {
      return;
    }

    this.contextUpdateQueue.add(analysis);
    const contextManager = this.connections.get("context-manager");
    if (!contextManager) {
      console.error("Context manager not connected");
      return;
    }

    try {
      await contextManager.client.callTool({
        name: "update-context",
        arguments: {
          content: JSON.stringify(analysis.analysis),
          source: analysis.path,
          timestamp: Date.now()
        }
      });
      this.contextUpdateQueue.delete(analysis);
    } catch (error) {
      console.error(`Failed to update context for ${analysis.path}:`, error);
      this.contextUpdateQueue.delete(analysis);
    }
  }

  async dispose() {
    // Clean up any pending operations
    this.analysisQueue.clear();
    this.contextUpdateQueue.clear();
  }
} 