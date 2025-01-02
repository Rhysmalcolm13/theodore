import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"
import { McpTool } from "../../../../src/shared/mcp"
import { vscode } from "../../utils/vscode"

interface ToolSchema {
	description?: string;
	type: string;
	[key: string]: any;
}

type McpToolRowProps = {
	tool: McpTool & { alwaysAllow?: boolean };
	serverName?: string;
	alwaysAllowMcp?: boolean;
}

const McpToolRow = ({ tool, serverName, alwaysAllowMcp }: McpToolRowProps) => {
	const handleAlwaysAllowChange = () => {
		if (!serverName) return;
		
		vscode.postMessage({
			type: "toggleToolAlwaysAllow",
			serverName,
			toolName: tool.name,
			alwaysAllow: !tool.alwaysAllow
		});
	}

	const renderParameters = () => {
		if (!tool.inputSchema?.properties) return null;
		
		return (
			<div style={{
				marginTop: "8px",
				fontSize: "12px",
				border: "1px solid color-mix(in srgb, var(--vscode-descriptionForeground) 30%, transparent)",
				borderRadius: "3px",
				padding: "8px",
			}}>
				<div style={{ marginBottom: "4px", opacity: 0.8, fontSize: "11px", textTransform: "uppercase" }}>
					Parameters
				</div>
				{Object.entries(tool.inputSchema.properties as Record<string, ToolSchema>).map(([paramName, schema]) => {
					const isRequired = tool.inputSchema?.required?.includes(paramName);
					return (
						<div key={paramName} style={{
							display: "flex",
							alignItems: "baseline",
							marginTop: "4px",
						}}>
							<code style={{
								color: "var(--vscode-textPreformat-foreground)",
								marginRight: "8px",
							}}>
								{paramName}
								{isRequired && <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>}
							</code>
							<span style={{
								opacity: 0.8,
								overflowWrap: "break-word",
								wordBreak: "break-word",
							}}>
								{schema.description || "No description"}
							</span>
						</div>
					);
				})}
			</div>
		);
	}

	return (
		<div key={tool.name} style={{ padding: "3px 0" }}>
			<div data-testid="tool-row-container"
				style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
				onClick={(e) => e.stopPropagation()}>
				<div style={{ display: "flex", alignItems: "center" }}>
					<span className="codicon codicon-symbol-method" style={{ marginRight: "6px" }}></span>
					<span style={{ fontWeight: 500 }}>{tool.name}</span>
				</div>
				{serverName && alwaysAllowMcp && (
					<VSCodeCheckbox
						checked={tool.alwaysAllow}
						onChange={handleAlwaysAllowChange}
						data-tool={tool.name}>
						Always allow
					</VSCodeCheckbox>
				)}
			</div>
			{tool.description && (
				<div style={{
					marginLeft: "0px",
					marginTop: "4px",
					opacity: 0.8,
					fontSize: "12px",
				}}>
					{tool.description}
				</div>
			)}
			{renderParameters()}
		</div>
	);
}

export default McpToolRow
