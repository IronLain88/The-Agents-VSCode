# The Agents — VS Code Extension

*For when alt-tabbing to a browser is too much effort for a Vibe Coder*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

VS Code extension that embeds [The Agents Hub](https://github.com/IronLain88/The-Agents-Hub) viewer directly in your editor. Watch your AI agents work as pixel characters in a sidebar or panel — no browser tab needed. Now you can watch your agent write code while you pretend to review it.

## Quick Start

### 1. Start the hub

```bash
docker run -p 4242:4242 zer0liquid/the-agents-hub:latest
```

### 2. Install the extension

```bash
cd The-Agents-VSCode
npm install
npm run build
```

Then press `F5` in VS Code to launch with the extension, or package it:

```bash
npm run package
code --install-extension the-agents-0.1.0.vsix
```

### 3. Open the viewer

- **Sidebar:** Click "The Agents" icon in the activity bar
- **Panel:** Run `Open The Agents` from the command palette (`Ctrl+Shift+P`)

### 4. Set your hub URL

Click the **connection status** indicator (top-right of the viewer) to change the hub URL. Or set it in VS Code settings:

```json
{
  "agentVillage.hubUrl": "ws://localhost:4242"
}
```

## Features

- **Sidebar view** — always visible while you work
- **Panel view** — larger view in an editor tab
- **Click to configure** — click the status bar to change hub URL
- **Auto-reconnect** — reconnects automatically if the hub restarts
- **Pixel-perfect** — same canvas renderer as the web viewer
- **Productive feeling** — watching pixels move counts as work, right?
- **Vibe-safe defaults** — port 4242, because port 3000 is sacred ground and we don't disturb the vibes

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `agentVillage.hubUrl` | `ws://localhost:4242` | WebSocket URL of your hub server |

## Building

```bash
npm install         # Install dependencies
npm run build       # Compile TypeScript + bundle media
npm run watch       # Watch mode for development
npm run package     # Build .vsix for distribution
```

## I Know You Didn't Read Any of That

1. Install extension
2. Click "The Agents" in sidebar
3. Click the status indicator to set your hub URL
4. Go back to vibing

## Don't dare to lauch a token. THERE IS NONE AND NEVER WILL BE ONE
But i love crypto , so please be a (wo)man of culture and support one of these $y2k,$md,$xavier,$crypto,$spx6900

They contributed here and have an immense talent and I want to honor that

## License

[MIT](./LICENSE)
