import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { DefaultServerConfig, ServerManagerConfig, ServerInstallOptions } from './types';
import { defaultServers } from './default-servers/config';
import { fileExistsAtPath } from '../../utils/fs';

export class ServerManager {
  private config: ServerManagerConfig;

  constructor(config: ServerManagerConfig) {
    this.config = config;
  }

  async initializeDefaultServers(context: vscode.ExtensionContext): Promise<void> {
    const settings = vscode.workspace
      .getConfiguration('theodore')
      .get<Record<string, boolean>>('defaultServers') || {};

    // Create settings directory if it doesn't exist
    await fs.mkdir(path.dirname(this.config.settingsPath), { recursive: true });

    // Load or create settings file
    let currentSettings: { mcpServers: Record<string, any> } = { mcpServers: {} };
    try {
      const content = await fs.readFile(this.config.settingsPath, 'utf-8');
      currentSettings = JSON.parse(content);
    } catch (error) {
      // File doesn't exist or is invalid, use empty settings
    }

    // Install and configure default servers
    for (const [serverId, server] of Object.entries(defaultServers)) {
      if (settings[serverId] !== false) {
        await this.ensureServerInstalled(server);
        currentSettings.mcpServers[serverId] = this.createServerConfig(server);
      }
    }

    // Save updated settings
    await fs.writeFile(
      this.config.settingsPath,
      JSON.stringify(currentSettings, null, 2)
    );
  }

  private createServerConfig(server: DefaultServerConfig) {
    return {
      command: server.command,
      args: [],
      env: {},
      disabled: !server.defaultEnabled,
      builtin: true
    };
  }

  async ensureServerInstalled(
    server: DefaultServerConfig,
    options: ServerInstallOptions = {}
  ): Promise<void> {
    const serverPath = path.join(this.config.installPath, server.name);
    
    if (!options.force && await this.isServerInstalled(serverPath)) {
      return;
    }

    if (server.builtin) {
      await this.installBuiltinServer(server);
    } else {
      await this.installFromNpm(server);
    }
  }

  private async isServerInstalled(serverPath: string): Promise<boolean> {
    return fileExistsAtPath(serverPath);
  }

  private async installBuiltinServer(server: DefaultServerConfig): Promise<void> {
    const sourcePath = path.join(this.config.builtinPath, server.name);
    const targetPath = path.join(this.config.installPath, server.name);

    // Ensure install directory exists
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    // Copy builtin server files
    await fs.cp(sourcePath, targetPath, { recursive: true });
  }

  private async installFromNpm(server: DefaultServerConfig): Promise<void> {
    // Implementation for npm installation if needed
    throw new Error('NPM installation not implemented');
  }

  async uninstallServer(serverId: string): Promise<void> {
    const serverPath = path.join(this.config.installPath, serverId);
    
    if (await fileExistsAtPath(serverPath)) {
      await fs.rm(serverPath, { recursive: true, force: true });
    }

    // Update settings
    const settingsContent = await fs.readFile(this.config.settingsPath, 'utf-8');
    const settings = JSON.parse(settingsContent);
    delete settings.mcpServers[serverId];
    await fs.writeFile(this.config.settingsPath, JSON.stringify(settings, null, 2));
  }
} 