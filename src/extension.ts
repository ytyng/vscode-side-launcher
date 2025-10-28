import * as vscode from "vscode";
import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import { ConfigurationLoader, TaskDefinition } from './configurationLoader';

class LauncherViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "sideLauncher";

  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
  ) {}

  private async _getTaskDefinitions(): Promise<TaskDefinition[]> {
    return await ConfigurationLoader.loadTaskDefinitions();
  }

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this._extensionUri,
      ],
    };

    webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case "runCommand":
            this._runCommand(message.command, message.taskType);
            break;
        }
      },
    );
  }

  public async _reloadTasks() {
    const tasks = await this._getTaskDefinitions();
    this._view?.webview.postMessage({
      type: "tasksUpdated",
      tasks: tasks,
    });
  }

  public showHelp() {
    this._view?.webview.postMessage({ type: "showHelp" });
  }

  private _runCommand(command: string, type?: string) {
    console.log("Running command:", command, "with type:", type);

    try {
      // ワークスペースルートパスを取得
      const workspaceFolders = vscode.workspace.workspaceFolders;
      console.log("Workspace folders:", workspaceFolders);
      
      let workspaceRoot: string;
      if (workspaceFolders && workspaceFolders.length > 0) {
        workspaceRoot = workspaceFolders[0].uri.fsPath;
        console.log("Using workspace root from VSCode:", workspaceRoot);
      } else {
        // フォールバック: 複数の方法でワークスペースを推定
        const extensionPath = this._extensionUri.fsPath;
        console.log("Extension path:", extensionPath);
        
        let currentDir = process.cwd();
        console.log("Current working directory:", currentDir);
        
        // VSCode でプロジェクトが開かれていない場合の警告
        if (currentDir === '/' || currentDir.includes('vscode-server')) {
          console.log("警告: VSCode Server または Remote 環境で実行されています。ワークスペースが正しく検出されない可能性があります。");
        }
        
        workspaceRoot = currentDir;
        console.log("Using current working directory as workspace root:", workspaceRoot);
      }

      // 現在開いているファイルのパス情報を取得
      const activeEditor = vscode.window.activeTextEditor;
      let currentFileAbsolutePath = '';
      let currentFileRelativePath = '';
      
      if (activeEditor) {
        currentFileAbsolutePath = activeEditor.document.uri.fsPath;
        // ワークスペースルートからの相対パスを計算
        if (currentFileAbsolutePath.startsWith(workspaceRoot)) {
          currentFileRelativePath = path.relative(workspaceRoot, currentFileAbsolutePath);
        } else {
          currentFileRelativePath = currentFileAbsolutePath;
        }
      }

      // 環境変数を設定
      const env = {
        ...process.env,
        VSCODE_WORKSPACE_ROOT: workspaceRoot,
        WORKSPACE_ROOT: workspaceRoot, // 短縮版
        CURRENT_FILE_ABSOLUTE_PATH: currentFileAbsolutePath,
        CURRENT_FILE_RELATIVE_PATH: currentFileRelativePath,
      };

      console.log("Environment variables set:", { 
        VSCODE_WORKSPACE_ROOT: env.VSCODE_WORKSPACE_ROOT,
        WORKSPACE_ROOT: env.WORKSPACE_ROOT,
        CURRENT_FILE_ABSOLUTE_PATH: env.CURRENT_FILE_ABSOLUTE_PATH,
        CURRENT_FILE_RELATIVE_PATH: env.CURRENT_FILE_RELATIVE_PATH
      });

      // タイプに応じて実行方法を変更
      if (type === 'shellOnVSCode') {
        // VSCode のターミナルで実行
        const terminal = vscode.window.createTerminal({
          name: 'Side Launcher',
          cwd: workspaceRoot,
          env: env
        });
        terminal.show();
        terminal.sendText(command);
        
        // VSCode ターミナルでの実行の場合、出力は直接取得できないため通知メッセージを送信
        this._view?.webview.postMessage({
          type: "commandOutput",
          output: {
            command: command,
            stdout: `コマンドをVSCodeターミナルで実行しました: ${command}`,
            stderr: "",
            error: null,
            stack: null,
          },
        });
      } else {
        // 従来通りの child_process での実行
        cp.exec(command, { env, cwd: workspaceRoot }, (error, stdout, stderr) => {
          const output = {
            command: command,
            stdout: stdout,
            stderr: stderr,
            error: error?.message,
            stack: error?.stack,
          };

          console.log("Command output:", output);

          this._view?.webview.postMessage({
            type: "commandOutput",
            output: output,
          });
        });
      }
    } catch (exception) {
      // exec の呼び出し自体でエラーが発生した場合
      const output = {
        command: command,
        stdout: "",
        stderr: "",
        error: exception instanceof Error
          ? exception.message
          : String(exception),
        stack: exception instanceof Error
          ? exception.stack
          : "Stack trace not available",
      };

      console.error("Command execution exception:", exception);

      this._view?.webview.postMessage({
        type: "commandOutput",
        output: output,
      });
    }
  }

  private async _getHtmlForWebview(webview: vscode.Webview) {
    const htmlPath = path.join(
      this._extensionUri.fsPath,
      "src",
      "webview.html",
    );
    let htmlContent = fs.readFileSync(htmlPath, "utf8");

    const tasks = await this._getTaskDefinitions();

    // タスクデータを JSON として webview に渡す
    const tasksJson = JSON.stringify(tasks);

    // HTML に tasks データを埋め込み
    htmlContent = htmlContent.replace(
      "<!-- TASKS_DATA_PLACEHOLDER -->",
      `<script>window.tasksData = ${tasksJson};</script>`,
    );

    return htmlContent;
  }
}

export async function activate(context: vscode.ExtensionContext) {
  console.log("Side Launcher extension is now active!");

  const provider = new LauncherViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      LauncherViewProvider.viewType,
      provider,
    ),
  );

  // 設定変更の監視を追加
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration('sideLauncher')) {
        // 設定が変更されたらタスクを再読み込み
        await provider._reloadTasks();
      }
    })
  );

  // ワークスペースファイルの変更を監視
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(async () => {
      await provider._reloadTasks();
    })
  );

  const disposable = vscode.commands.registerCommand(
    "side-launcher.helloWorld",
    () => {
      vscode.window.showInformationMessage("Hello World from Side Launcher!");
    },
  );

  context.subscriptions.push(disposable);

  // Help コマンド
  context.subscriptions.push(
    vscode.commands.registerCommand("side-launcher.help", () => {
      provider.showHelp();
    })
  );

  // Reload コマンド
  context.subscriptions.push(
    vscode.commands.registerCommand("side-launcher.reload", async () => {
      await provider._reloadTasks();
    })
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
