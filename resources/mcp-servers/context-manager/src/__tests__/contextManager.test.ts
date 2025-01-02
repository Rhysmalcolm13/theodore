import { ContextManager } from "../contextManager";
import * as fs from "fs/promises";
import * as path from "path";

jest.mock("fs/promises");

describe("ContextManager", () => {
  let contextManager: ContextManager;
  const mockStorageDir = path.join(process.cwd(), ".context");

  beforeEach(() => {
    jest.resetAllMocks();
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.readdir as jest.Mock).mockResolvedValue([]);
    contextManager = new ContextManager();
  });

  describe("updateContext", () => {
    it("should store new context entries", async () => {
      const content = "test content";
      const filePath = "/test/file.ts";
      
      await contextManager.updateContext(content, filePath);
      
      const context = await contextManager.getContext();
      expect(context).toContain(content);
      expect(context).toContain(filePath);
    });

    it("should maintain the maximum number of entries", async () => {
      // Mock implementation for fs operations
      const savedFiles = new Set<string>();
      (fs.writeFile as jest.Mock).mockImplementation((path) => {
        savedFiles.add(path);
        return Promise.resolve();
      });
      (fs.unlink as jest.Mock).mockImplementation((path) => {
        savedFiles.delete(path);
        return Promise.resolve();
      });

      // Add more than maxEntries
      for (let i = 0; i < 105; i++) {
        await contextManager.updateContext(
          `content ${i}`,
          `/test/file${i}.ts`
        );
      }

      const context = await contextManager.getContext();
      const contextLines = context.split("\n");
      const fileCount = contextLines.filter(line => line.startsWith("File:")).length;
      
      expect(fileCount).toBeLessThanOrEqual(100);
    });
  });

  describe("clearContext", () => {
    it("should remove all context entries", async () => {
      // Add some context entries
      await contextManager.updateContext("test1", "/test/file1.ts");
      await contextManager.updateContext("test2", "/test/file2.ts");

      // Clear context
      await contextManager.clearContext();

      const context = await contextManager.getContext();
      expect(context).toBe("");
    });
  });
}); 