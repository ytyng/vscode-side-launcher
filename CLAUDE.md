# VSCode Side Launcher

An extension that shows a command launcher in the VSCode sidebar.

## Project Overview

- **Name**: side-launcher
- **Type**: VSCode extension
- **Language**: TypeScript
- **Build tools**: npm, tsc
- **Tests**: npm test
- **Versioning**: Based on the Git commit count (`npm run update-version`)

## Architecture

### File structure

```
├── src/
│   ├── extension.ts        # Main extension code
│   ├── webview.html        # Sidebar UI
│   └── version.json        # Version information
├── scripts/
│   └── update-version.js   # Version update script
├── .vscode/
│   └── settings.json       # VSCode project settings
└── package.json            # Extension settings and scripts
```

### Main features

1. **Loading task definitions**
   - VSCode settings (`sideLauncher.tasks`)
   - External JSON file (`~/.config/vscode-side-launcher/tasks.json`)
   - Both settings are merged and displayed

2. **Providing environment variables**
   - `$VSCODE_WORKSPACE_ROOT`: Workspace root path
   - `$WORKSPACE_ROOT`: Short form

3. **Dynamic UI generation**
   - Buttons are generated dynamically from the settings
   - Command output is displayed in real time

## Notes for Development

### Commands

- `npm run compile`: Compile TypeScript
- `npm run update-version`: Update the version
- `npm test`: Run tests
- Press F5 to run with debugging

### Configuration examples

VSCode settings:
```json
{
  "sideLauncher.tasks": [
    {
      "label": "Run tests",
      "command": "cd $WORKSPACE_ROOT && npm test"
    }
  ]
}
```

External JSON:
```json
[
  {
    "label": "Git Status",
    "command": "cd $VSCODE_WORKSPACE_ROOT && git status"
  }
]
```

### Debugging

- Check the console log in VSCode Developer Tools
- Detailed logs are printed when commands run
- Stack traces are also shown on errors

## Technical Specifications

- **VSCode API**: webview, workspace, configuration
- **Node.js API**: child_process, fs, path, os
- **UI**: HTML + CSS (using VSCode theme variables)
- **Settings**: IntelliSense support via JSON Schema

## Possible Future Extensions

- Additional command types (other than shell)
- UI customization
- Command history
- Favorites