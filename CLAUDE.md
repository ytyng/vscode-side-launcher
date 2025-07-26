# VSCode Side Launcher

VSCode のサイドバーにコマンドランチャーを表示する拡張機能。

## プロジェクト概要

- **名前**: side-launcher
- **種類**: VSCode 拡張機能
- **言語**: TypeScript
- **ビルドツール**: npm, tsc
- **テスト**: npm test
- **バージョン管理**: Git コミット数ベース (`npm run update-version`)

## アーキテクチャ

### ファイル構成

```
├── src/
│   ├── extension.ts        # メイン拡張機能コード
│   ├── webview.html        # サイドバー UI
│   └── version.json        # バージョン情報
├── scripts/
│   └── update-version.js   # バージョン更新スクリプト
├── .vscode/
│   └── settings.json       # VSCode プロジェクト設定
└── package.json            # 拡張機能設定とスクリプト
```

### 主要機能

1. **タスク定義の読み込み**
   - VSCode settings (`sideLauncher.tasks`)
   - 外部 JSON ファイル (`~/.config/vscode-side-launcher/tasks.json`)
   - 両方の設定をマージして表示

2. **環境変数の提供**
   - `$VSCODE_WORKSPACE_ROOT`: ワークスペースルートパス
   - `$WORKSPACE_ROOT`: 短縮版

3. **動的 UI 生成**
   - 設定からボタンを動的に生成
   - リアルタイムでコマンド出力を表示

## 開発時の注意点

### コマンド実行

- `npm run compile`: TypeScript コンパイル
- `npm run update-version`: バージョン更新
- `npm test`: テスト実行
- F5 でデバッグ実行

### 設定例

VSCode settings:
```json
{
  "sideLauncher.tasks": [
    {
      "label": "テスト実行",
      "command": "cd $WORKSPACE_ROOT && npm test"
    }
  ]
}
```

外部 JSON:
```json
[
  {
    "label": "Git Status",
    "command": "cd $VSCODE_WORKSPACE_ROOT && git status"
  }
]
```

### デバッグ

- VSCode Developer Tools でコンソールログを確認
- コマンド実行時の詳細ログが出力される
- エラー時はスタックトレースも表示

## 技術仕様

- **VSCode API**: webview, workspace, configuration
- **Node.js API**: child_process, fs, path, os
- **UI**: HTML + CSS (VSCode テーマ変数使用)
- **設定**: JSON Schema で IntelliSense 対応

## 今後の拡張可能性

- コマンドタイプの追加 (shell 以外)
- UI のカスタマイズ機能
- コマンド履歴機能
- お気に入り機能