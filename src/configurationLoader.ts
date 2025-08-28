import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface TaskDefinition {
  label: string;
  type?: string;
  command: string;
}

export class ConfigurationLoader {
  /**
   * すべての設定ソースからタスク定義を読み込んでマージする
   */
  public static async loadTaskDefinitions(): Promise<TaskDefinition[]> {
    const tasks: TaskDefinition[] = [];
    const addedCommands = new Set<string>();

    // 1. ワークスペースファイルの設定を読み込み（*.code-workspace）
    await this.loadWorkspaceFileSettings(tasks, addedCommands);

    // 2. 各ワークスペースフォルダーの.vscode/settings.jsonを読み込み
    await this.loadWorkspaceFolderSettings(tasks, addedCommands);

    // 3. VSCode のグローバル・ワークスペース設定を読み込み（API経由）
    await this.loadVSCodeSettings(tasks, addedCommands);

    // 4. 外部JSONファイルから読み込み（~/.config/vscode-side-launcher/tasks.json）
    await this.loadExternalJsonFile(tasks, addedCommands);

    // 5. デフォルト説明コマンド
    if (tasks.length === 0) {
      tasks.push(this.getDefaultHelpTask());
    }

    console.log(`[ConfigurationLoader] 読み込まれたタスク総数: ${tasks.length}`);
    return tasks;
  }

  /**
   * *.code-workspace ファイルの設定を読み込む
   */
  private static async loadWorkspaceFileSettings(
    tasks: TaskDefinition[],
    addedCommands: Set<string>
  ): Promise<void> {
    try {
      // ワークスペースファイルのパスを取得
      const workspaceFile = vscode.workspace.workspaceFile;
      if (!workspaceFile || workspaceFile.scheme !== 'file') {
        console.log('[ConfigurationLoader] ワークスペースファイルが存在しません');
        return;
      }

      const workspaceFilePath = workspaceFile.fsPath;
      console.log(`[ConfigurationLoader] ワークスペースファイルを読み込み中: ${workspaceFilePath}`);
      
      if (!fs.existsSync(workspaceFilePath)) {
        console.log('[ConfigurationLoader] ワークスペースファイルが見つかりません');
        return;
      }

      // ワークスペースファイルを読み込み
      const workspaceContent = fs.readFileSync(workspaceFilePath, 'utf8');
      const workspaceConfig = JSON.parse(workspaceContent);

      let loadedCount = 0;

      // settings.sideLauncher.tasks を取得
      if (workspaceConfig.settings?.sideLauncher?.tasks) {
        const workspaceTasks = workspaceConfig.settings.sideLauncher.tasks as TaskDefinition[];
        for (const task of workspaceTasks) {
          const key = `${task.label}:${task.command}`;
          if (!addedCommands.has(key)) {
            tasks.push(task);
            addedCommands.add(key);
            loadedCount++;
          }
        }
        console.log(`[ConfigurationLoader] ワークスペースファイルから ${loadedCount} 個のタスクを読み込みました`);
      }

      // フォルダー別の設定も読み込み
      if (workspaceConfig.folders && Array.isArray(workspaceConfig.folders)) {
        for (const folder of workspaceConfig.folders) {
          if (folder.settings?.sideLauncher?.tasks) {
            const folderTasks = folder.settings.sideLauncher.tasks as TaskDefinition[];
            let folderLoadedCount = 0;
            for (const task of folderTasks) {
              const key = `${task.label}:${task.command}`;
              if (!addedCommands.has(key)) {
                tasks.push(task);
                addedCommands.add(key);
                folderLoadedCount++;
              }
            }
            console.log(`[ConfigurationLoader] フォルダー設定から ${folderLoadedCount} 個のタスクを読み込みました`);
          }
        }
      }
    } catch (error) {
      console.error("[ConfigurationLoader] ワークスペースファイルの読み込みでエラー:", error);
    }
  }

  /**
   * VSCodeの設定（グローバル・ワークスペース）から読み込み
   */
  private static async loadVSCodeSettings(
    tasks: TaskDefinition[],
    addedCommands: Set<string>
  ): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration("sideLauncher");
      const settingsTasks = config.get<TaskDefinition[]>("tasks", []);
      let loadedCount = 0;
      for (const task of settingsTasks) {
        const key = `${task.label}:${task.command}`;
        if (!addedCommands.has(key)) {
          tasks.push(task);
          addedCommands.add(key);
          loadedCount++;
        }
      }
      if (loadedCount > 0) {
        console.log(`[ConfigurationLoader] VSCode設定から ${loadedCount} 個のタスクを読み込みました`);
      }
    } catch (error) {
      console.error("[ConfigurationLoader] VSCode設定の読み込みでエラー:", error);
    }
  }

  /**
   * 各ワークスペースフォルダーの設定を読み込み
   */
  private static async loadWorkspaceFolderSettings(
    tasks: TaskDefinition[],
    addedCommands: Set<string>
  ): Promise<void> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        console.log('[ConfigurationLoader] ワークスペースフォルダーが存在しません');
        return;
      }

      for (const folder of workspaceFolders) {
        let folderLoadedCount = 0;
        console.log(`[ConfigurationLoader] フォルダーの設定を読み込み中: ${folder.uri.fsPath}`);
        
        // フォルダー内の .vscode/settings.json を直接読み込み
        const settingsPath = path.join(folder.uri.fsPath, '.vscode', 'settings.json');
        if (fs.existsSync(settingsPath)) {
          try {
            const settingsContent = fs.readFileSync(settingsPath, 'utf8');
            // JSONコメントを除去してパース
            const settings = this.parseJsonWithComments(settingsContent);
            if (settings.sideLauncher?.tasks) {
              const folderTasks = settings.sideLauncher.tasks as TaskDefinition[];
              for (const task of folderTasks) {
                const key = `${task.label}:${task.command}`;
                if (!addedCommands.has(key)) {
                  tasks.push(task);
                  addedCommands.add(key);
                  folderLoadedCount++;
                }
              }
            }
          } catch (error) {
            console.error(`[ConfigurationLoader] ${settingsPath} の読み込みでエラー:`, error);
          }
        }

        // VSCode API経由でも取得（フォールバック）
        const folderConfig = vscode.workspace.getConfiguration("sideLauncher", folder.uri);
        const folderTasks = folderConfig.get<TaskDefinition[]>("tasks", []);
        for (const task of folderTasks) {
          const key = `${task.label}:${task.command}`;
          if (!addedCommands.has(key)) {
            tasks.push(task);
            addedCommands.add(key);
            folderLoadedCount++;
          }
        }
        
        if (folderLoadedCount > 0) {
          console.log(`[ConfigurationLoader] フォルダー ${folder.name} から ${folderLoadedCount} 個のタスクを読み込みました`);
        }
      }
    } catch (error) {
      console.error("[ConfigurationLoader] ワークスペースフォルダー設定の読み込みでエラー:", error);
    }
  }

  /**
   * 外部JSONファイルから読み込み
   */
  private static async loadExternalJsonFile(
    tasks: TaskDefinition[],
    addedCommands: Set<string>
  ): Promise<void> {
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
        let loadedCount = 0;
        for (const task of jsonTasks) {
          const key = `${task.label}:${task.command}`;
          if (!addedCommands.has(key)) {
            tasks.push(task);
            addedCommands.add(key);
            loadedCount++;
          }
        }
        console.log(`[ConfigurationLoader] 外部設定ファイルから ${loadedCount} 個のタスクを読み込みました`);
      } else {
        console.log(`[ConfigurationLoader] 外部設定ファイルが存在しません: ${configPath}`);
      }
    } catch (error) {
      console.error("[ConfigurationLoader] 外部JSON設定ファイルの読み込みでエラー:", error);
    }
  }

  /**
   * JSONコメントを含むコンテンツをパースする
   */
  private static parseJsonWithComments(content: string): any {
    // シングルラインコメント（//）を削除
    const withoutSingleLineComments = content.replace(/\/\/.*$/gm, '');
    // マルチラインコメント（/* */）を削除
    const withoutComments = withoutSingleLineComments.replace(/\/\*[\s\S]*?\*\//g, '');
    // 末尾のカンマを削除（JSONでは無効なため）
    const withoutTrailingCommas = withoutComments.replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(withoutTrailingCommas);
  }

  /**
   * デフォルトのヘルプタスクを返す
   */
  private static getDefaultHelpTask(): TaskDefinition {
    const configPath = path.join(
      os.homedir(),
      ".config",
      "vscode-side-launcher",
      "tasks.json",
    );

    return {
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

type は省略可能で、以下が使用できます:
- shell (デフォルト): child_process で実行
- shellOnVSCode: VSCode のターミナルで実行

コマンド内では以下の環境変数が利用可能です:
- \\$VSCODE_WORKSPACE_ROOT: VSCode で開いているワークスペースのルートパス
- \\$WORKSPACE_ROOT: 上記の短縮版
- \\$CURRENT_FILE_ABSOLUTE_PATH: 現在開いているファイルの絶対パス
- \\$CURRENT_FILE_RELATIVE_PATH: 現在開いているファイルの相対パス

使用例:
- cd \\$WORKSPACE_ROOT && npm test
- ls -la \\$VSCODE_WORKSPACE_ROOT/src
- echo \\$CURRENT_FILE_ABSOLUTE_PATH
- git add \\$CURRENT_FILE_RELATIVE_PATH"`,
    };
  }
}