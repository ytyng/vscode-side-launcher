import * as vscode from "vscode";
import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

interface TaskDefinition {
  label: string;
  type?: string;
  command: string;
}

class LauncherViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "sideLauncher";

  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
  ) {}

  private _getTaskDefinitions(): TaskDefinition[] {
    const tasks: TaskDefinition[] = [];

    // VSCode settings から読み込み
    const config = vscode.workspace.getConfiguration("sideLauncher");
    const settingsTasks = config.get<TaskDefinition[]>("tasks", []);
    tasks.push(...settingsTasks);

    // 外部 JSON ファイルから読み込み
    const configPath = path.join(
      os.homedir(),
      ".config",
      "vscode-side-launcher",
      "tasks.json",
    );
    try {
      if (fs.existsSync(configPath)) {
        const jsonContent = fs.readFileSync(configPath, "utf8");
        const jsonTasks = JSON.parse(jsonContent) as TaskDefinition[];
        tasks.push(...jsonTasks);
      }
    } catch (error) {
      console.error("JSON設定ファイルの読み込みでエラー:", error);
    }

    // 設定が無い場合のデフォルト説明コマンド
    if (tasks.length === 0) {
      tasks.push({
        label: "説明を表示",
        command:
          `echo "VSCode の settings の sideLauncher.tasks もしくは ${configPath} に下記の設定を定義することで、カスタムコマンドを追加できます:

[
  {
    \\"label\\": \\"コマンドの名前\\",
    \\"type\\": \\"shell\\",
    \\"command\\": \\"コマンドライン\\"
  }
]

type は省略可能で、デフォルトは shell です。

コマンド内では以下の環境変数が利用可能です:
- \\$VSCODE_WORKSPACE_ROOT: VSCode で開いているワークスペースのルートパス
- \\$WORKSPACE_ROOT: 上記の短縮版

使用例:
- cd \\$WORKSPACE_ROOT && npm test
- ls -la \\$VSCODE_WORKSPACE_ROOT/src"`,
      });
    }

    return tasks;
  }

  public resolveWebviewView(
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

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(
      (message) => {
        switch (message.type) {
          case "runCommand":
            this._runCommand(message.command);
            break;
        }
      },
    );
  }

  private _runCommand(command: string) {
    console.log("Running command:", command);

    try {
      // ワークスペースルートパスを取得
      const workspaceFolders = vscode.workspace.workspaceFolders;
      const workspaceRoot = workspaceFolders && workspaceFolders.length > 0
        ? workspaceFolders[0].uri.fsPath
        : process.cwd();

      // 環境変数を設定
      const env = {
        ...process.env,
        VSCODE_WORKSPACE_ROOT: workspaceRoot,
        WORKSPACE_ROOT: workspaceRoot, // 短縮版
      };

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

  private _getHtmlForWebview(webview: vscode.Webview) {
    const htmlPath = path.join(
      this._extensionUri.fsPath,
      "src",
      "webview.html",
    );
    let htmlContent = fs.readFileSync(htmlPath, "utf8");

    const tasks = this._getTaskDefinitions();

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

export function activate(context: vscode.ExtensionContext) {
  console.log("Side Launcher extension is now active!");

  const provider = new LauncherViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      LauncherViewProvider.viewType,
      provider,
    ),
  );

  const disposable = vscode.commands.registerCommand(
    "side-launcher.helloWorld",
    () => {
      vscode.window.showInformationMessage("Hello World from Side Launcher!");
    },
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
