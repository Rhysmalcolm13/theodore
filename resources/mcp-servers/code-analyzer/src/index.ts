import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { CodeAnalyzer } from "./analyzer";
import * as fs from "fs/promises";
import * as path from "path";

class CodeAnalyzerServer {
  private server: Server;
  private analyzer: CodeAnalyzer;

  constructor() {
    this.server = new Server(
      {
        name: "code-analyzer",
        version: "1.0.0"
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.analyzer = new CodeAnalyzer();
    this.setupRequestHandlers();
  }

  private setupRequestHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "analyze-file",
            description: "Analyze a source code file",
            parameters: {
              type: "object",
              properties: {
                path: { type: "string" },
                content: { type: "string" }
              },
              required: ["path", "content"]
            }
          },
          {
            name: "analyze-directory",
            description: "Analyze all source files in a directory",
            parameters: {
              type: "object",
              properties: {
                path: { type: "string" },
                exclude: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              required: ["path"]
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
        case "analyze-file": {
          if (!args || typeof args !== "object") {
            throw new Error("Invalid arguments for analyze-file");
          }

          const { path: filePath, content } = args as { path: string; content: string };
          const extension = path.extname(filePath);
          
          let analysis;
          if (['.ts', '.tsx'].includes(extension)) {
            analysis = await this.analyzer.analyzeTypeScript(content, filePath);
          } else if (['.js', '.jsx'].includes(extension)) {
            analysis = await this.analyzer.analyzeJavaScript(content, filePath);
          } else {
            throw new Error(`Unsupported file type: ${extension}`);
          }

          return {
            result: this.analyzer.formatAnalysis(analysis)
          };
        }

        case "analyze-directory": {
          if (!args || typeof args !== "object") {
            throw new Error("Invalid arguments for analyze-directory");
          }

          const { path: dirPath, exclude = [] } = args as { path: string; exclude?: string[] };
          const excludeSet = new Set(exclude);

          const results: string[] = [];
          const files = await this.getSourceFiles(dirPath);

          for (const file of files) {
            if (excludeSet.has(file)) continue;

            try {
              const content = await fs.readFile(path.join(dirPath, file), 'utf-8');
              const extension = path.extname(file);
              
              let analysis;
              if (['.ts', '.tsx'].includes(extension)) {
                analysis = await this.analyzer.analyzeTypeScript(content, file);
              } else if (['.js', '.jsx'].includes(extension)) {
                analysis = await this.analyzer.analyzeJavaScript(content, file);
              } else {
                continue;
              }

              results.push(`File: ${file}\n${this.analyzer.formatAnalysis(analysis)}\n`);
            } catch (error) {
              console.error(`Error analyzing ${file}:`, error);
              results.push(`Error analyzing ${file}: ${error}\n`);
            }
          }

          return {
            result: results.join('\n---\n\n')
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async getSourceFiles(dirPath: string): Promise<string[]> {
    const files = await fs.readdir(dirPath);
    return files.filter(file => {
      const ext = path.extname(file);
      return ['.ts', '.tsx', '.js', '.jsx'].includes(ext);
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Code Analyzer MCP server running on stdio");
  }
}

// Start the server
const server = new CodeAnalyzerServer();
server.start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
}); 