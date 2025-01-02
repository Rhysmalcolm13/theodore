import { ContextManager } from "../manager";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

jest.mock("fs/promises");
jest.mock("path");
jest.mock("os");

describe("ContextManager", () => {
  let manager: ContextManager;
  const mockStorageDir = "/mock/storage/dir";
  const mockStorageFile = "/mock/storage/dir/context.json";

  beforeEach(() => {
    jest.resetAllMocks();
    (os.homedir as jest.Mock).mockReturnValue("/mock/home");
    (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));
    manager = new ContextManager();
  });

  describe("initialization", () => {
    it("should create storage directory if it doesn't exist", async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockRejectedValue({ code: "ENOENT" });

      await (manager as any).initializeStorage();

      expect(fs.mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it("should load existing entries from storage file", async () => {
      const mockEntries = [
        { content: "test content", source: "test.ts", timestamp: 123456789 }
      ];
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockEntries));

      await (manager as any).initializeStorage();

      expect((manager as any).entries).toEqual(mockEntries);
    });
  });

  describe("updateContext", () => {
    it("should add new entry at the beginning", async () => {
      const entry = {
        content: "test content",
        source: "test.ts",
        timestamp: 123456789
      };
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await manager.updateContext(entry);

      expect((manager as any).entries[0]).toEqual(entry);
    });

    it("should limit the number of entries", async () => {
      const maxEntries = 2;
      manager = new ContextManager(maxEntries);

      const entries = [
        { content: "entry 1", source: "test1.ts", timestamp: 1 },
        { content: "entry 2", source: "test2.ts", timestamp: 2 },
        { content: "entry 3", source: "test3.ts", timestamp: 3 }
      ];

      for (const entry of entries) {
        await manager.updateContext(entry);
      }

      expect((manager as any).entries.length).toBe(maxEntries);
      expect((manager as any).entries[0]).toEqual(entries[2]);
      expect((manager as any).entries[1]).toEqual(entries[1]);
    });
  });

  describe("getContext", () => {
    it("should return formatted context entries", async () => {
      const entries = [
        { content: "test content 1", source: "test1.ts", timestamp: 123456789 },
        { content: "test content 2", source: "test2.ts", timestamp: 987654321 }
      ];
      (manager as any).entries = entries;

      const result = await manager.getContext();

      expect(result).toContain("Entry 1:");
      expect(result).toContain("test content 1");
      expect(result).toContain("test1.ts");
      expect(result).toContain("Entry 2:");
      expect(result).toContain("test content 2");
      expect(result).toContain("test2.ts");
    });

    it("should respect maxEntries parameter", async () => {
      const entries = [
        { content: "test content 1", source: "test1.ts", timestamp: 123456789 },
        { content: "test content 2", source: "test2.ts", timestamp: 987654321 }
      ];
      (manager as any).entries = entries;

      const result = await manager.getContext(1);

      expect(result).toContain("Entry 1:");
      expect(result).toContain("test content 1");
      expect(result).not.toContain("Entry 2:");
      expect(result).not.toContain("test content 2");
    });

    it("should return appropriate message when no entries exist", async () => {
      (manager as any).entries = [];

      const result = await manager.getContext();

      expect(result).toBe("No context available.");
    });
  });

  describe("clearContext", () => {
    it("should clear all entries", async () => {
      (manager as any).entries = [
        { content: "test content", source: "test.ts", timestamp: 123456789 }
      ];
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await manager.clearContext();

      expect((manager as any).entries).toEqual([]);
    });
  });
}); 