# Side Launcher

VSCode のサイドバーにコマンドランチャーを追加する拡張機能です。よく使うコマンドを簡単に実行できます。

## 機能

- **サイドバーランチャー**: VSCode のサイドバーにコマンド実行ボタンを表示
- **カスタムコマンド設定**: VSCode settings または外部 JSON ファイルでコマンドを定義
- **実行方式の選択**: child_process または VSCode ターミナルでの実行を選択可能
- **ワークスペース連携**: `$VSCODE_WORKSPACE_ROOT` や `$WORKSPACE_ROOT` 環境変数でプロジェクトパスを取得
- **ファイル連携**: `$CURRENT_FILE_ABSOLUTE_PATH` や `$CURRENT_FILE_RELATIVE_PATH` で現在開いているファイル情報を取得
- **リアルタイム出力**: コマンドの実行結果をリアルタイムで表示
- **エラーデバッグ**: スタックトレース表示でエラー原因を特定

## コマンド設定

### VSCode Settings

`settings.json` に以下のように設定：

```json
{
  "sideLauncher.tasks": [
    {
      "label": "テストを実行",
      "type": "shell",
      "command": "cd $WORKSPACE_ROOT && npm test"
    },
    {
      "label": "ビルド (VSCodeターミナルで実行)",
      "type": "shellOnVSCode",
      "command": "cd $WORKSPACE_ROOT && npm run build"
    },
    {
      "label": "現在ファイルをGitに追加",
      "type": "shellOnVSCode",
      "command": "git add $CURRENT_FILE_RELATIVE_PATH"
    }
  ]
}
```

### 外部 JSON ファイル

`${HOME}/.config/vscode-side-launcher/tasks.json` にも設定可能：

```json
[
  {
    "label": "Git Status (ターミナルで実行)",
    "type": "shellOnVSCode",
    "command": "cd $VSCODE_WORKSPACE_ROOT && git status"
  },
  {
    "label": "プロジェクト情報",
    "type": "shell",
    "command": "ls -la $WORKSPACE_ROOT"
  },
  {
    "label": "現在ファイルのパスを表示",
    "type": "shell",
    "command": "echo \"絶対パス: $CURRENT_FILE_ABSOLUTE_PATH\" && echo \"相対パス: $CURRENT_FILE_RELATIVE_PATH\""
  }
]
```

## 環境変数

コマンド内で以下の環境変数が利用可能：

- `$VSCODE_WORKSPACE_ROOT`: VSCode で開いているワークスペースのルートパス
- `$WORKSPACE_ROOT`: 上記の短縮版
- `$CURRENT_FILE_ABSOLUTE_PATH`: 現在開いているファイルの絶対パス
- `$CURRENT_FILE_RELATIVE_PATH`: 現在開いているファイルのプロジェクトルートからの相対パス

## 設定項目

### `sideLauncher.tasks`

タスク定義の配列。各タスクは以下の項目を持ちます：

- `label` (必須): コマンドの表示名
- `command` (必須): 実行するコマンド
- `type` (省略可能): コマンドタイプ
  - `shell` (デフォルト): child_process で実行し、結果をサイドバーに表示
  - `shellOnVSCode`: VSCode のターミナルで実行

## インストール

1. このリポジトリをクローン
2. `npm install` で依存関係をインストール
3. `npm run compile` でコンパイル
4. F5 で拡張機能をデバッグ実行

## 開発

### バージョン管理

```bash
npm run update-version
```

Git のコミット数を基にバージョン番号を自動更新します。

### ビルド

```bash
npm run compile
```

### テスト

```bash
npm test
```

## リリースノート

### 0.1.x

- VSCode settings と外部 JSON ファイルからのタスク定義読み込み機能
- ワークスペースルートパス用環境変数の追加
- エラー時のスタックトレース表示機能
- HTML/TS の分離とボタンの動的生成
- バージョン管理システムの導入
- `shellOnVSCode` タイプによる VSCode ターミナルでのコマンド実行機能
- 現在開いているファイル情報の環境変数 (`CURRENT_FILE_ABSOLUTE_PATH`, `CURRENT_FILE_RELATIVE_PATH`) 追加

## ライセンス

MIT License
