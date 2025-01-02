import * as fs from "fs/promises";
import * as path from "path";

interface ContextEntry {
  content: string;
  path: string;
  timestamp: number;
}

export class ContextManager {
  private context: Map<string, ContextEntry>;
  private readonly maxEntries = 100;
  private readonly storageDir: string;

  constructor() {
    this.context = new Map();
    this.storageDir = path.join(process.cwd(), ".context");
    this.initializeStorage().catch(console.error);
  }

  private async initializeStorage(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      // Load existing context from storage
      const files = await fs.readdir(this.storageDir);
      for (const file of files) {
        if (file.endsWith(".context")) {
          const content = await fs.readFile(path.join(this.storageDir, file), "utf-8");
          const entry = JSON.parse(content) as ContextEntry;
          this.context.set(entry.path, entry);
        }
      }
    } catch (error) {
      console.error("Failed to initialize storage:", error);
    }
  }

  private async saveContext(entry: ContextEntry): Promise<void> {
    const filename = Buffer.from(entry.path).toString("base64") + ".context";
    await fs.writeFile(
      path.join(this.storageDir, filename),
      JSON.stringify(entry),
      "utf-8"
    );
  }

  async updateContext(content: string, filePath: string): Promise<void> {
    const entry: ContextEntry = {
      content,
      path: filePath,
      timestamp: Date.now()
    };

    // Add new entry
    this.context.set(filePath, entry);
    await this.saveContext(entry);

    // Remove oldest entries if we exceed maxEntries
    if (this.context.size > this.maxEntries) {
      const entries = Array.from(this.context.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, entries.length - this.maxEntries);
      
      for (const [key] of toRemove) {
        this.context.delete(key);
        const filename = Buffer.from(key).toString("base64") + ".context";
        await fs.unlink(path.join(this.storageDir, filename)).catch(console.error);
      }
    }
  }

  async getContext(): Promise<string> {
    // Convert context to a readable format
    const entries = Array.from(this.context.values());
    entries.sort((a, b) => b.timestamp - a.timestamp);

    return entries
      .map(entry => `File: ${entry.path}\n${entry.content}\n---\n`)
      .join("\n");
  }

  async clearContext(): Promise<void> {
    this.context.clear();
    try {
      const files = await fs.readdir(this.storageDir);
      await Promise.all(
        files.map(file => 
          fs.unlink(path.join(this.storageDir, file)).catch(console.error)
        )
      );
    } catch (error) {
      console.error("Failed to clear context storage:", error);
    }
  }
} 