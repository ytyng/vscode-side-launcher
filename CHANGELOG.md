# Change Log

All notable changes to the "Side Launcher" extension will be documented in this file.

## [0.1.23]

- First public release on the VSCode Marketplace
- Sidebar command launcher with dynamically generated buttons
- Task definitions from VSCode settings (`sideLauncher.tasks`) and an external JSON file (`~/.config/vscode-side-launcher/tasks.json`)
- Execution modes: `shell` (child_process, output shown in sidebar) and `shellOnVSCode` (VSCode terminal)
- Workspace and current-file environment variables (`$VSCODE_WORKSPACE_ROOT`, `$WORKSPACE_ROOT`, `$CURRENT_FILE_ABSOLUTE_PATH`, `$CURRENT_FILE_RELATIVE_PATH`)
- Help and Reload buttons in the view title bar
