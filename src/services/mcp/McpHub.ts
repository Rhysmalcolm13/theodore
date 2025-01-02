import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import {
	CallToolResultSchema,
	ListResourcesResultSchema,
	ListResourceTemplatesResultSchema,
	ListToolsResultSchema,
	ReadResourceResultSchema,
	NotificationSchema
} from "@modelcontextprotocol/sdk/types.js"
import chokidar, { FSWatcher } from "chokidar"
import * as vscode from "vscode"
import * as path from "path"
import { z } from "zod"
import { ClineProvider } from "../../core/webview/ClineProvider"
import { McpServer, McpConnection, McpTool } from "../../shared/mcp"
import { ServerManager } from './ServerManager'
import { ServerCommunication } from './ServerCommunication'
import { McpServerParameters } from './types'

export class McpHub {
	private providerRef: WeakRef<ClineProvider>
	private settingsWatcher?: vscode.FileSystemWatcher
	private fileWatchers: Map<string, FSWatcher>
	protected connections: Map<string, McpConnection>
	private communication: ServerCommunication
	private serverManager: ServerManager
	public isConnecting: boolean

	constructor(provider: ClineProvider) {
		this.providerRef = new WeakRef(provider)
		this.fileWatchers = new Map()
		this.connections = new Map()
		this.communication = new ServerCommunication()
		this.isConnecting = false
		this.serverManager = new ServerManager({
			installPath: provider.getInstallPath(),
			settingsPath: provider.getSettingsPath(),
			builtinPath: provider.getBuiltinPath()
		})
	}

	async initialize(): Promise<void> {
		const derefProvider = this.providerRef.deref()
		if (!derefProvider) {return}

		await this.serverManager.initializeDefaultServers(derefProvider.context)
		await this.connectToEnabledServers()
	}

	private async connectToEnabledServers(): Promise<void> {
		const settings = await this.loadSettings()
		for (const [serverId, config] of Object.entries(settings.mcpServers)) {
			if (!config.disabled) {
				const server: McpServer = {
					id: serverId,
					command: config.command,
					args: config.args,
					env: config.env,
					disabled: false,
					name: serverId,
					config: JSON.stringify(config)
				}
				await this.connectServer(server)
			}
		}
	}

	async connectServer(server: McpServer): Promise<void> {
		if (this.connections.has(server.id)) {return}

		try {
			const transport = new StdioClientTransport({
				command: server.command,
				args: server.args,
				env: server.env
			})

			const client = new Client(
				{
					name: server.id,
					version: "1.0.0"
				},
				{
					capabilities: {
						experimental: {},
						sampling: {},
						roots: { listChanged: false }
					}
				}
			)
			
			const connection: McpConnection = { server, client, transport, status: 'connected' }
			this.connections.set(server.id, connection)
			this.communication.registerConnection(server.id, connection)
		} catch (error) {
			console.error(`Failed to connect to server ${server.id}:`, error)
			throw error
		}
	}

	async disconnectServer(serverId: string): Promise<void> {
		const connection = this.connections.get(serverId)
		if (!connection) {return}

		try {
			await connection.transport.close()
			this.connections.delete(serverId)
		} catch (error) {
			console.error(`Error disconnecting from ${serverId}:`, error)
			throw error
		}
	}

	async restartConnection(serverId: string): Promise<void> {
		const connection = this.connections.get(serverId)
		if (!connection) {return}

		await this.disconnectServer(serverId)
		await this.connectServer(connection.server)
	}

	async toggleServerDisabled(serverId: string, disabled: boolean): Promise<void> {
		const settings = await this.loadSettings()
		const config = settings.mcpServers[serverId]
		if (!config) {return}

		config.disabled = disabled
		await this.saveSettings(settings)

		if (config.disabled) {
			await this.disconnectServer(serverId)
		} else {
			const server: McpServer = {
				id: serverId,
				command: config.command,
				args: config.args,
				env: config.env,
				disabled: false,
				name: serverId,
				config: JSON.stringify(config)
			}
			await this.connectServer(server)
		}
	}

	async toggleToolAlwaysAllow(serverId: string, toolName: string, alwaysAllow: boolean): Promise<void> {
		const settings = await this.loadSettings()
		const config = settings.mcpServers[serverId]
		if (!config) {return}

		config.alwaysAllow = config.alwaysAllow || []
		const index = config.alwaysAllow.indexOf(toolName)
		if (alwaysAllow && index === -1) {
			config.alwaysAllow.push(toolName)
		} else if (!alwaysAllow && index !== -1) {
			config.alwaysAllow.splice(index, 1)
		}

		await this.saveSettings(settings)
	}

	getServers(): McpServer[] {
		return Array.from(this.connections.values())
			.filter(conn => !conn.server.disabled)
			.map(conn => conn.server)
	}

	getMcpSettingsFilePath(): string {
		const derefProvider = this.providerRef.deref()
		if (!derefProvider) {
			throw new Error("Provider not available")
		}
		return derefProvider.getSettingsPath()
	}

	getMcpServersPath(): string {
		const derefProvider = this.providerRef.deref()
		if (!derefProvider) {
			throw new Error("Provider not available")
		}
		return derefProvider.getMcpServersPath()
	}

	private async loadSettings(): Promise<{ mcpServers: Record<string, McpServerParameters> }> {
		const settingsPath = this.getMcpSettingsFilePath()
		try {
			const content = await vscode.workspace.fs.readFile(vscode.Uri.file(settingsPath))
			return JSON.parse(content.toString())
		} catch (error) {
			console.error("Failed to load settings:", error)
			return { mcpServers: {} }
		}
	}

	private async saveSettings(settings: { mcpServers: Record<string, McpServerParameters> }): Promise<void> {
		const settingsPath = this.getMcpSettingsFilePath()
		try {
			await vscode.workspace.fs.writeFile(
				vscode.Uri.file(settingsPath),
				Buffer.from(JSON.stringify(settings, null, 2))
			)
		} catch (error) {
			console.error("Failed to save settings:", error)
			throw error
		}
	}

	async dispose(): Promise<void> {
		await this.communication.dispose()

		for (const [_, connection] of this.connections) {
			try {
				await connection.transport.close()
			} catch (error) {
				console.error(`Error disconnecting from ${connection.server.id}:`, error)
			}
		}
		this.connections.clear()

		for (const watcher of this.fileWatchers.values()) {
			watcher.close()
		}
		this.fileWatchers.clear()

		this.settingsWatcher?.dispose()
	}

	async callTool(serverId: string, toolName: string, toolArguments: Record<string, unknown> = {}): Promise<any> {
		const connection = this.connections.get(serverId)
		if (!connection) {
			throw new Error(`No connection found for server: ${serverId}`)
		}

		if (connection.server.disabled) {
			throw new Error(`Server "${serverId}" is disabled and cannot be used`)
		}

		return connection.client.request({
			method: 'tools/call',
			params: {
				name: toolName,
				arguments: toolArguments
			}
		}, CallToolResultSchema)
	}

	async readResource(serverId: string, uri: string): Promise<any> {
		const connection = this.connections.get(serverId)
		if (!connection) {
			throw new Error(`No connection found for server: ${serverId}`)
		}

		if (connection.server.disabled) {
			throw new Error(`Server "${serverId}" is disabled`)
		}

		return connection.client.request({
			method: 'resources/read',
			params: { uri }
		}, ReadResourceResultSchema)
	}
}
