import * as vscode from 'vscode';
import * as cp from 'child_process';

class LauncherViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'sideLauncher';

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(
			message => {
				switch (message.type) {
					case 'runCommand':
						this._runCommand(message.command);
						break;
				}
			}
		);
	}

	private _runCommand(command: string) {
		cp.exec(command, (error, stdout, stderr) => {
			const output = {
				command: command,
				stdout: stdout,
				stderr: stderr,
				error: error?.message
			};

			this._view?.webview.postMessage({
				type: 'commandOutput',
				output: output
			});
		});
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Side Launcher</title>
				<style>
					body {
						font-family: var(--vscode-font-family);
						font-size: var(--vscode-font-size);
						font-weight: var(--vscode-font-weight);
						color: var(--vscode-foreground);
						background-color: var(--vscode-editor-background);
						padding: 10px;
						margin: 0;
					}
					.button-group {
						display: flex;
						flex-direction: column;
						gap: 8px;
						margin-bottom: 20px;
					}
					button {
						background-color: var(--vscode-button-background);
						color: var(--vscode-button-foreground);
						border: 1px solid var(--vscode-button-border, transparent);
						border-radius: 2px;
						padding: 8px 12px;
						cursor: pointer;
						font-size: 13px;
						transition: all 0.2s;
					}
					button:hover {
						background-color: var(--vscode-button-hoverBackground);
					}
					button:active {
						transform: translateY(1px);
					}
					.log-area {
						border-top: 1px solid var(--vscode-panel-border);
						padding-top: 15px;
						max-height: 300px;
						overflow-y: auto;
					}
					.log-title {
						font-weight: bold;
						margin-bottom: 10px;
						color: var(--vscode-titleBar-activeForeground);
					}
					.log-entry {
						margin-bottom: 12px;
						padding: 8px;
						background-color: var(--vscode-editor-selectionBackground);
						border-radius: 3px;
						font-family: var(--vscode-editor-font-family);
						font-size: 12px;
					}
					.log-command {
						font-weight: bold;
						color: var(--vscode-terminal-ansiBlue);
						margin-bottom: 4px;
					}
					.log-stdout {
						color: var(--vscode-terminal-ansiBrightGreen);
						white-space: pre-wrap;
					}
					.log-stderr {
						color: var(--vscode-terminal-ansiRed);
						white-space: pre-wrap;
					}
					.log-error {
						color: var(--vscode-errorForeground);
						white-space: pre-wrap;
					}
				</style>
			</head>
			<body>
				<div class="button-group">
					<button onclick="runCommand('env')">📝 Environment Variables</button>
					<button onclick="runCommand('date')">🕒 Current Date</button>
					<button onclick="runCommand('pwd')">📂 Current Directory</button>
					<button onclick="runCommand('whoami')">👤 Current User</button>
					<button onclick="runCommand('uptime')">⏱️ System Uptime</button>
					<button onclick="runCommand('df -h')">💾 Disk Usage</button>
				</div>

				<div class="log-area">
					<div class="log-title">Command Output</div>
					<div id="logContainer"></div>
				</div>

				<script>
					const vscode = acquireVsCodeApi();
					
					function runCommand(command) {
						vscode.postMessage({
							type: 'runCommand',
							command: command
						});
					}

					window.addEventListener('message', event => {
						const message = event.data;
						switch (message.type) {
							case 'commandOutput':
								addLogEntry(message.output);
								break;
						}
					});

					function addLogEntry(output) {
						const logContainer = document.getElementById('logContainer');
						const logArea = logContainer.parentElement;
						const logEntry = document.createElement('div');
						logEntry.className = 'log-entry';
						
						let html = '<div class="log-command">$ ' + output.command + '</div>';
						
						if (output.stdout) {
							html += '<div class="log-stdout">' + escapeHtml(output.stdout) + '</div>';
						}
						
						if (output.stderr) {
							html += '<div class="log-stderr">' + escapeHtml(output.stderr) + '</div>';
						}
						
						if (output.error) {
							html += '<div class="log-error">Error: ' + escapeHtml(output.error) + '</div>';
						}
						
						logEntry.innerHTML = html;
						logContainer.appendChild(logEntry);
						
						// DOM更新後に新しいエントリの位置までスクロール
						setTimeout(() => {
							if (logArea) {
								logEntry.scrollIntoView({ behavior: 'smooth', block: 'start' });
							}
						}, 50);
					}

					function escapeHtml(text) {
						const div = document.createElement('div');
						div.textContent = text;
						return div.innerHTML;
					}
				</script>
			</body>
			</html>`;
	}
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Side Launcher extension is now active!');

	const provider = new LauncherViewProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(LauncherViewProvider.viewType, provider)
	);

	const disposable = vscode.commands.registerCommand('side-launcher.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Side Launcher!');
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
