# WordOrb Vocabulary -- VS Code Extension

Look up any English word instantly from your editor. Definitions, IPA pronunciation, etymology, and translations in 47 languages -- powered by the WordOrb API.

## Features

- **Hover Definitions** -- Hover over any English word to see its definition and IPA.
- **Selection Lookup** -- Select text and press `Ctrl+Shift+W` (or `Cmd+Shift+W` on Mac) to open a full word card in a side panel.
- **Command Palette** -- `WordOrb: Look Up Word`, `WordOrb: Daily Word`, `WordOrb: Take a Quiz`.
- **Status Bar** -- Daily lesson title displayed in the status bar. Click to expand.
- **Rich Webview** -- Full word details, 5-phase lessons, and interactive quizzes in a VS Code panel.

## Setup

1. Install the extension from the VS Code Marketplace.
2. Open Settings (`Ctrl+,`) and search for `wordorb`.
3. Enter your API key (starts with `wo_`). Get one at [wordorb.ai](https://wordorb.ai).

## Commands

| Command | Keybinding | Description |
|---------|-----------|-------------|
| `WordOrb: Look Up Word` | -- | Prompt for a word and show full details |
| `WordOrb: Look Up Selected Text` | `Ctrl+Shift+W` | Look up the currently selected text |
| `WordOrb: Daily Word` | -- | Show today's vocabulary lesson |
| `WordOrb: Take a Quiz` | -- | Start an interactive vocabulary quiz |

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `wordorb.apiKey` | `""` | Your WordOrb API key |
| `wordorb.defaultTone` | `"neutral"` | Default tone for lookups |
| `wordorb.enableHover` | `true` | Show definitions on hover |
| `wordorb.showStatusBar` | `true` | Show daily word in status bar |

## API Coverage

- **Word Orb** -- 162K words, IPA, etymology, 47 languages
- **Lesson Orb** -- 226K lessons, 4 tracks, 3 age groups
- **Quiz Orb** -- 21K assessments, 6 question types

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Package for distribution
npm run package
```

## Publishing to the VS Code Marketplace

### Prerequisites

1. **Azure DevOps organization** -- Create one at [dev.azure.com](https://dev.azure.com).
2. **Personal Access Token (PAT)** -- Create a PAT with "Marketplace (Manage)" scope.
3. **Publisher** -- Create a publisher at [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage).

### Steps

1. **Install vsce:**
   ```bash
   npm install -g @vscode/vsce
   ```

2. **Log in:**
   ```bash
   vsce login lessonoftheday
   ```
   Enter your PAT when prompted.

3. **Package:**
   ```bash
   vsce package
   ```
   This creates `wordorb-vocabulary-1.0.0.vsix`.

4. **Publish:**
   ```bash
   vsce publish
   ```

5. **Verify** at [marketplace.visualstudio.com](https://marketplace.visualstudio.com/items?itemName=lessonoftheday.wordorb-vocabulary).

### Updating

1. Bump version in `package.json`.
2. Run `vsce publish minor` (or `patch` / `major`).

### Icon and Banner

Place these files in the `assets/` directory:
- `icon.png` -- 128x128 or 256x256 PNG, square
- `banner.png` -- Optional marketplace banner

Reference the icon in `package.json` with `"icon": "assets/icon.png"`.

## License

MIT
