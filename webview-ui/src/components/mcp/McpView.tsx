import { VSCodeButton, VSCodeCheckbox, VSCodeDivider } from "@vscode/webview-ui-toolkit/react"
import { McpServer } from "../../../../src/shared/mcp"
import { useExtensionState } from "../../context/ExtensionStateContext"
import { vscode } from "../../utils/vscode"
import McpToolRow from "./McpToolRow"
import McpResourceRow from "./McpResourceRow"
import { useState } from "react"

interface McpViewProps {
	onClose: () => void
}

const McpView = ({ onClose }: McpViewProps) => {
	const { mcpServers, alwaysAllowMcp } = useExtensionState()
	const [expandedServers, setExpandedServers] = useState<string[]>([])

	const handleRowClick = (serverName: string) => {
		setExpandedServers(prev => {
			if (prev.includes(serverName)) {
				return prev.filter(name => name !== serverName)
			}
			return [...prev, serverName]
		})
	}

	const handleAlwaysAllowChange = (e: any) => {
		vscode.postMessage({
			type: "alwaysAllowMcp",
			bool: e.target.checked
		})
	}

	const getStatusColor = (server: McpServer) => {
		if (server.config && typeof server.config === 'object' && 'disabled' in server.config) {
			return "var(--vscode-errorForeground)"
		}
		if (server.status === "error") return "var(--vscode-errorForeground)"
		if (server.status === "connected") return "var(--vscode-testing-iconPassed)"
		return "var(--vscode-testing-iconQueued)"
	}

	return (
		<div style={{
			display: "flex",
			flexDirection: "column",
			height: "100%",
			padding: "16px",
			gap: "16px",
		}}>
			<div style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
			}}>
				<h2 style={{ margin: 0 }}>Model Context Protocol</h2>
				<VSCodeButton appearance="icon" onClick={onClose}>
					<i className="codicon codicon-close" />
				</VSCodeButton>
			</div>

			<VSCodeCheckbox checked={alwaysAllowMcp} onChange={handleAlwaysAllowChange}>
				<span style={{ fontWeight: "500" }}>Always allow MCP server access</span>
			</VSCodeCheckbox>

			<VSCodeDivider />

			<div style={{
				display: "flex",
				flexDirection: "column",
				gap: "8px",
				flex: 1,
				overflowY: "auto",
			}}>
				{mcpServers.map(server => (
					<div key={server.name} style={{
						display: "flex",
						flexDirection: "column",
						gap: "8px",
						border: "1px solid color-mix(in srgb, var(--vscode-descriptionForeground) 30%, transparent)",
						borderRadius: "3px",
						padding: "8px",
					}}>
						<div
							onClick={() => handleRowClick(server.name)}
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								cursor: "pointer",
							}}
						>
							<i className={`codicon codicon-${expandedServers.includes(server.name) ? "chevron-down" : "chevron-right"}`} />
							<div style={{
								width: "8px",
								height: "8px",
								borderRadius: "50%",
								backgroundColor: getStatusColor(server),
							}} />
							<div style={{ flex: 1 }}>
								<div style={{ fontWeight: "500" }}>{server.name}</div>
								{server.description && (
									<div style={{ opacity: 0.8, fontSize: "12px" }}>{server.description}</div>
								)}
							</div>
							{server.config && typeof server.config === 'object' && 'disabled' in server.config && (
								<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px" }}>Disabled</div>
							)}
						</div>

						{expandedServers.includes(server.name) && (
							<div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingLeft: "24px" }}>
								{server.tools?.map(tool => (
									<McpToolRow
										key={tool.name}
										tool={tool}
										serverName={server.name}
										alwaysAllowMcp={alwaysAllowMcp}
									/>
								))}
								{server.resources?.map(resource => (
									<McpResourceRow
										key={resource.uri}
										item={resource}
									/>
								))}
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	)
}

export default McpView
