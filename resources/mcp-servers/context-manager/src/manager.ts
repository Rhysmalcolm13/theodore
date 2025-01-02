import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

interface ContextEntry {
  content: string;
  source: string;
  timestamp: number;
}

export class ContextManager {
  private entries: ContextEntry[];
  private readonly maxEntries: number;
  private readonly storageDir: string;
  private readonly storageFile: string;

  constructor(maxEntries = 100) {
    this.entries = [];
    this.maxEntries = maxEntries;
    this.storageDir = path.join(os.homedir(), ".theodore", "context");
    this.storageFile = path.join(this.storageDir, "context.json");
    this.initializeStorage().catch(error => {
      console.error("Failed to initialize storage:", error);
    });
  }

  private async initializeStorage(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      try {
        const data = await fs.readFile(this.storageFile, "utf-8");
        this.entries = JSON.parse(data);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
        // File doesn't exist yet, which is fine for first run
        this.entries = [];
      }
    } catch (error) {
      console.error("Error initializing storage:", error);
      throw error;
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      await fs.writeFile(
        this.storageFile,
        JSON.stringify(this.entries, null, 2),
        "utf-8"
      );
    } catch (error) {
      console.error("Error saving context to storage:", error);
      throw error;
    }
  }

  async updateContext(entry: ContextEntry): Promise<void> {
    // Add new entry at the beginning
    this.entries.unshift(entry);

    // Remove oldest entries if we exceed maxEntries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }

    await this.saveToStorage();
  }

  async getContext(maxEntries?: number): Promise<string> {
    const limit = maxEntries || this.maxEntries;
    const entries = this.entries.slice(0, limit);

    if (entries.length === 0) {
      return "No context available.";
    }

    const lines: string[] = [];
    entries.forEach((entry, index) => {
      lines.push(`Entry ${index + 1}:`);
      lines.push(`Source: ${entry.source}`);
      lines.push(`Timestamp: ${new Date(entry.timestamp).toISOString()}`);
      lines.push("Content:");
      lines.push(entry.content);
      lines.push("---");
    });

    return lines.join("\n");
  }

  async clearContext(): Promise<void> {
    this.entries = [];
    await this.saveToStorage();
  }

  async dispose(): Promise<void> {
    await this.saveToStorage();
  }
} 