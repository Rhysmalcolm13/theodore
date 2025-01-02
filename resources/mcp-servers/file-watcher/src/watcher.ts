import * as chokidar from "chokidar";
import { EventEmitter } from "events";
import * as path from "path";

export interface WatchOptions {
  recursive: boolean;
  exclude: Set<string>;
}

interface FileChangeEvent {
  type: "add" | "change" | "unlink";
  path: string;
  timestamp: number;
}

export class FileWatcher extends EventEmitter {
  private watchers: Map<string, chokidar.FSWatcher>;
  private options: Map<string, WatchOptions>;

  constructor() {
    super();
    this.watchers = new Map();
    this.options = new Map();
  }

  async watchDirectory(dirPath: string, options: WatchOptions): Promise<void> {
    if (this.watchers.has(dirPath)) {
      throw new Error(`Already watching directory: ${dirPath}`);
    }

    const watcherOptions = {
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      depth: options.recursive ? undefined : 0,
      ignored: (filePath: string) => {
        const relativePath = path.relative(dirPath, filePath);
        return options.exclude.has(relativePath);
      }
    };

    const watcher = chokidar.watch(dirPath, watcherOptions);

    watcher
      .on("add", (filePath) => {
        this.emit("change", {
          type: "add",
          path: filePath,
          timestamp: Date.now()
        } as FileChangeEvent);
      })
      .on("change", (filePath) => {
        this.emit("change", {
          type: "change",
          path: filePath,
          timestamp: Date.now()
        } as FileChangeEvent);
      })
      .on("unlink", (filePath) => {
        this.emit("change", {
          type: "unlink",
          path: filePath,
          timestamp: Date.now()
        } as FileChangeEvent);
      })
      .on("error", (error) => {
        console.error(`Error watching ${dirPath}:`, error);
      });

    this.watchers.set(dirPath, watcher);
    this.options.set(dirPath, options);
  }

  async stopWatching(dirPath: string): Promise<void> {
    const watcher = this.watchers.get(dirPath);
    if (!watcher) {
      throw new Error(`Not watching directory: ${dirPath}`);
    }

    await watcher.close();
    this.watchers.delete(dirPath);
    this.options.delete(dirPath);
  }

  async listWatched(): Promise<string[]> {
    return Array.from(this.watchers.keys());
  }

  async dispose(): Promise<void> {
    const promises = Array.from(this.watchers.values()).map(watcher => watcher.close());
    await Promise.all(promises);
    this.watchers.clear();
    this.options.clear();
  }
} 