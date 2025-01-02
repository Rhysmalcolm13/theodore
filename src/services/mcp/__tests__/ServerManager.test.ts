/// <reference types="jest" />

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ServerManager } from '../ServerManager';
import { defaultServers } from '../default-servers/config';
import { fileExistsAtPath } from '../../../utils/fs';

jest.mock('vscode');
jest.mock('fs/promises');
jest.mock('../../../utils/fs');

describe('ServerManager', () => {
  const mockConfig = {
    installPath: '/mock/install/path',
    settingsPath: '/mock/settings/path',
    builtinPath: '/mock/builtin/path'
  };

  let manager: ServerManager;
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    manager = new ServerManager(mockConfig);
    mockContext = {
      extensionPath: '/mock/extension/path',
      globalStorageUri: { fsPath: '/mock/storage/path' }
    } as unknown as vscode.ExtensionContext;

    (fileExistsAtPath as jest.Mock).mockResolvedValue(false);
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockResolvedValue('{"mcpServers": {}}');
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.cp as jest.Mock).mockResolvedValue(undefined);
  });

  describe('initializeDefaultServers', () => {
    it('should initialize default servers when enabled', async () => {
      const mockSettings = { 'context-manager': true };
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue(mockSettings)
      });

      await manager.initializeDefaultServers(mockContext);

      // Should create settings directory
      expect(fs.mkdir).toHaveBeenCalledWith(
        path.dirname(mockConfig.settingsPath),
        { recursive: true }
      );

      // Should install enabled servers
      expect(fs.cp).toHaveBeenCalled();

      // Should update settings file
      expect(fs.writeFile).toHaveBeenCalledWith(
        mockConfig.settingsPath,
        expect.stringContaining('"context-manager"'),
        expect.any(String)
      );
    });

    it('should skip disabled servers', async () => {
      const mockSettings = { 'context-manager': false };
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue(mockSettings)
      });

      await manager.initializeDefaultServers(mockContext);

      // Should not install disabled servers
      expect(fs.cp).not.toHaveBeenCalled();
    });
  });

  describe('ensureServerInstalled', () => {
    it('should install server if not already installed', async () => {
      const server = defaultServers['context-manager'];
      await manager.ensureServerInstalled(server);

      expect(fs.cp).toHaveBeenCalledWith(
        path.join(mockConfig.builtinPath, server.name),
        path.join(mockConfig.installPath, server.name),
        { recursive: true }
      );
    });

    it('should skip installation if server already exists', async () => {
      (fileExistsAtPath as jest.Mock).mockResolvedValue(true);
      const server = defaultServers['context-manager'];
      
      await manager.ensureServerInstalled(server);

      expect(fs.cp).not.toHaveBeenCalled();
    });
  });

  describe('uninstallServer', () => {
    it('should remove server files and update settings', async () => {
      const serverId = 'context-manager';
      await manager.uninstallServer(serverId);

      expect(fs.rm).toHaveBeenCalledWith(
        path.join(mockConfig.installPath, serverId),
        { recursive: true, force: true }
      );

      expect(fs.writeFile).toHaveBeenCalledWith(
        mockConfig.settingsPath,
        expect.not.stringContaining(serverId),
        expect.any(String)
      );
    });
  });
}); 