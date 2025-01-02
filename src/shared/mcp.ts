import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export interface McpServer {
	id: string;
	command: string;
	args?: string[];
	env?: Record<string, string>;
	disabled?: boolean;
	description?: string;
	status?: 'connecting' | 'connected' | 'error';
	tools?: McpTool[];
	inputSchema?: Record<string, any>;
	resourceTemplates?: McpResourceTemplate[];
	resources?: McpResource[];
	name: string;
	config: string;
}

export interface McpConnection {
	server: McpServer;
	client: Client;
	transport: StdioClientTransport;
	status: 'connecting' | 'connected' | 'error';
	error?: string;
}

export interface McpTool {
	name: string;
	description: string;
	alwaysAllow?: boolean;
	parameters: {
		type: string;
		properties: Record<string, any>;
		required?: string[];
	};
	inputSchema?: Record<string, any>;
}

export interface McpToolCallResponse {
	result: any;
}

export interface McpResource {
	id: string;
	type: string;
	content: string;
	uri: string;
	name: string;
	description: string;
	mimeType: string;
}

export interface McpResourceTemplate {
	id: string;
	type: string;
	description: string;
	parameters: Record<string, any>;
	uriTemplate: string;
	name: string;
	mimeType: string;
}

export interface McpResourceResponse {
	content: string;
}
