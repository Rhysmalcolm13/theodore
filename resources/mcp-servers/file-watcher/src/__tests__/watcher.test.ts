import { FileWatcher } from "../watcher";
import * as chokidar from "chokidar";
import { EventEmitter } from "events";
import * as path from "path";
import { WatchOptions } from "../watcher";

jest.mock("chokidar");
jest.mock("path");

describe("FileWatcher", () => {
  let watcher: FileWatcher;
  let mockFSWatcher: chokidar.FSWatcher;

  beforeEach(() => {
    jest.resetAllMocks();
    mockFSWatcher = new EventEmitter() as chokidar.FSWatcher;
    mockFSWatcher.close = jest.fn().mockResolvedValue(undefined);
    (chokidar.watch as jest.Mock).mockReturnValue(mockFSWatcher);
    (path.resolve as jest.Mock).mockImplementation((...args) => args.join("/"));
    (path.relative as jest.Mock).mockImplementation((from, to) => to);
    watcher = new FileWatcher();
  });

  describe("watchDirectory", () => {
    it("should set up watcher with correct options", async () => {
      const dirPath = "/test/dir";
      const options: WatchOptions = {
        recursive: true,
        exclude: new Set(["node_modules"])
      };

      await watcher.watchDirectory(dirPath, options);

      expect(chokidar.watch).toHaveBeenCalledWith(dirPath, expect.objectContaining({
        persistent: true,
        ignoreInitial: true,
        followSymlinks: false,
        depth: undefined
      }));
    });

    it("should set up watcher with non-recursive depth", async () => {
      const dirPath = "/test/dir";
      const options: WatchOptions = {
        recursive: false,
        exclude: new Set()
      };

      await watcher.watchDirectory(dirPath, options);

      expect(chokidar.watch).toHaveBeenCalledWith(dirPath, expect.objectContaining({
        depth: 0
      }));
    });

    it("should emit change events", async () => {
      const dirPath = "/test/dir";
      const options: WatchOptions = {
        recursive: true,
        exclude: new Set()
      };

      const changeHandler = jest.fn();
      watcher.on("change", changeHandler);

      await watcher.watchDirectory(dirPath, options);

      // Simulate file events
      mockFSWatcher.emit("add", "/test/dir/file.txt");
      mockFSWatcher.emit("change", "/test/dir/file.txt");
      mockFSWatcher.emit("unlink", "/test/dir/file.txt");

      expect(changeHandler).toHaveBeenCalledTimes(3);
      expect(changeHandler).toHaveBeenCalledWith(expect.objectContaining({
        type: "add",
        path: "/test/dir/file.txt"
      }));
      expect(changeHandler).toHaveBeenCalledWith(expect.objectContaining({
        type: "change",
        path: "/test/dir/file.txt"
      }));
      expect(changeHandler).toHaveBeenCalledWith(expect.objectContaining({
        type: "unlink",
        path: "/test/dir/file.txt"
      }));
    });

    it("should respect exclude patterns", async () => {
      const dirPath = "/test/dir";
      const options: WatchOptions = {
        recursive: true,
        exclude: new Set(["ignored.txt"])
      };

      await watcher.watchDirectory(dirPath, options);

      const watchOptions = (chokidar.watch as jest.Mock).mock.calls[0][1];
      const isIgnored = watchOptions.ignored;

      expect(isIgnored("/test/dir/ignored.txt")).toBe(true);
      expect(isIgnored("/test/dir/not-ignored.txt")).toBe(false);
    });

    it("should throw error if directory is already being watched", async () => {
      const dirPath = "/test/dir";
      const options: WatchOptions = {
        recursive: true,
        exclude: new Set()
      };

      await watcher.watchDirectory(dirPath, options);

      await expect(watcher.watchDirectory(dirPath, options)).rejects.toThrow(
        "Already watching directory: /test/dir"
      );
    });
  });

  describe("stopWatching", () => {
    it("should close watcher and remove from tracking", async () => {
      const dirPath = "/test/dir";
      const options: WatchOptions = {
        recursive: true,
        exclude: new Set()
      };

      await watcher.watchDirectory(dirPath, options);
      await watcher.stopWatching(dirPath);

      expect(mockFSWatcher.close).toHaveBeenCalled();
      expect(await watcher.listWatched()).not.toContain(dirPath);
    });

    it("should throw error if directory is not being watched", async () => {
      await expect(watcher.stopWatching("/not/watched")).rejects.toThrow(
        "Not watching directory: /not/watched"
      );
    });
  });

  describe("listWatched", () => {
    it("should return list of watched directories", async () => {
      const dirs = ["/test/dir1", "/test/dir2"];
      const options: WatchOptions = {
        recursive: true,
        exclude: new Set()
      };

      for (const dir of dirs) {
        await watcher.watchDirectory(dir, options);
      }

      const watched = await watcher.listWatched();
      expect(watched).toEqual(dirs);
    });
  });

  describe("dispose", () => {
    it("should close all watchers", async () => {
      const dirs = ["/test/dir1", "/test/dir2"];
      const options: WatchOptions = {
        recursive: true,
        exclude: new Set()
      };

      for (const dir of dirs) {
        await watcher.watchDirectory(dir, options);
      }

      await watcher.dispose();

      expect(mockFSWatcher.close).toHaveBeenCalledTimes(2);
      expect(await watcher.listWatched()).toEqual([]);
    });
  });
}); 