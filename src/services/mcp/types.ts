import { StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js";

export interface McpServerParameters extends StdioServerParameters {
  disabled?: boolean;
  alwaysAllow?: string[];
}

export interface DefaultServerConfig {
  name: string;
  command: string;
  description: string;
  defaultEnabled: boolean;
  builtin: boolean;
  version: string;
}

export interface ServerManagerConfig {
  installPath: string;
  settingsPath: string;
  builtinPath: string;
}

export interface ServerInstallOptions {
  force?: boolean;
  skipCache?: boolean;
} 