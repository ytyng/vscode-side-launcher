import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

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
		const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'webview.html');
		const htmlContent = fs.readFileSync(htmlPath, 'utf8');
		return htmlContent;
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
