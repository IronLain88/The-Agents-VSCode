import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

let panel: vscode.WebviewPanel | undefined;

/**
 * Validates and sanitizes the hub URL to prevent injection attacks
 */
function validateHubUrl(url: string): { ws: string; http: string } {
  const wsMatch = url.match(/^(wss?):\/\/([a-zA-Z0-9._-]+)(:\d+)?$/);
  if (!wsMatch) {
    throw new Error('Hub URL must be a WebSocket URL (e.g. ws://localhost:4242 or ws://localhost:4242)');
  }

  const wsUrl = `${wsMatch[1]}://${wsMatch[2]}${wsMatch[3] || ''}`;
  const httpUrl = wsUrl.replace(/^ws/, 'http');

  return { ws: wsUrl, http: httpUrl };
}

/**
 * Escapes HTML special characters to prevent XSS
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getWebviewHtml(webview: vscode.Webview, mediaPath: string): string {
  const config = vscode.workspace.getConfiguration('agentVillage');
  const rawHubUrl = config.get<string>('hubUrl') || 'ws://localhost:4242';
  const apiKey = config.get<string>('apiKey') || '';

  // Validate and sanitize hub URL
  let hubUrl: string, httpUrl: string;
  try {
    const validated = validateHubUrl(rawHubUrl);
    hubUrl = validated.ws;
    httpUrl = validated.http;
  } catch (error) {
    // Fallback to secure default
    console.error('Invalid hub URL, using default:', error);
    hubUrl = 'ws://localhost:4242';
    httpUrl = 'http://localhost:4242';
  }

  const stationLogicUri = webview.asWebviewUri(vscode.Uri.file(path.join(mediaPath, 'viewer', 'station-logic.js')));
  const viewerJsUri = webview.asWebviewUri(vscode.Uri.file(path.join(mediaPath, 'viewer', 'viewer.js')));

  const characterBase = webview.asWebviewUri(vscode.Uri.file(path.join(mediaPath, 'assets', 'characters'))).toString();
  const animatedBase = webview.asWebviewUri(vscode.Uri.file(path.join(mediaPath, 'assets', 'animated'))).toString();
  const assetBase = webview.asWebviewUri(vscode.Uri.file(path.join(mediaPath, 'assets'))).toString();

  const cssPath = path.join(mediaPath, 'viewer', 'style.css');
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

  // Generate nonce for inline scripts (security best practice)
  const nonce = crypto.randomBytes(16).toString('base64');

  // Escape URLs for safe injection into HTML
  const safeHubWsUrl = escapeHtml(hubUrl);
  const safeHubHttpUrl = escapeHtml(httpUrl);

  // Restrictive CSP with nonce
  const csp = [
    "default-src 'none'",
    `img-src ${webview.cspSource} ${httpUrl}`,
    `script-src ${webview.cspSource} 'nonce-${nonce}'`,
    "style-src 'unsafe-inline'",
    `connect-src ${hubUrl} ${httpUrl}`
  ].join('; ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>The Agents</title>
  <style>${css}</style>
</head>
<body>
  <nav class="top-nav">
    <span id="auth-status" style="margin-left:auto;font-size:12px;cursor:pointer"></span>
  </nav>
  <canvas id="village"></canvas>
  <div id="status" class="status disconnected">Connecting...</div>
  <script nonce="${nonce}">
    window.VILLAGE_CONFIG = {
      hubWsUrl: "${safeHubWsUrl}",
      hubHttpUrl: "${safeHubHttpUrl}",
      characterBase: "${escapeHtml(characterBase)}",
      animatedBase: "${escapeHtml(animatedBase)}",
      assetBase: "${escapeHtml(assetBase)}",
      spriteBase: "${safeHubHttpUrl}/assets/sprites",
      apiKey: "${escapeHtml(apiKey)}"
    };

    // VSCode webview API for settings
    const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
    document.addEventListener('DOMContentLoaded', () => {
      const status = document.getElementById('status');
      if (status && vscode) {
        status.title = 'Click to change hub URL';
        status.addEventListener('click', () => vscode.postMessage({ type: 'changeHubUrl' }));
      }
    });
  </script>
  <script type="module" nonce="${nonce}">
    import * as SL from '${stationLogicUri}';
    window.StationLogic = SL;

    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.nonce = '${nonce}';
      s.src = '${viewerJsUri}';
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
  </script>
</body>
</html>`;
}

async function handleChangeHubUrl(webview: vscode.Webview, mediaPath: string) {
  const config = vscode.workspace.getConfiguration('agentVillage');
  const current = config.get<string>('hubUrl') || 'ws://localhost:4242';
  const url = await vscode.window.showInputBox({
    prompt: 'Enter your hub WebSocket URL',
    value: current,
    placeHolder: 'ws://localhost:4242',
    validateInput: (v) => {
      if (!/^wss?:\/\/[a-zA-Z0-9._-]+(:\d+)?$/.test(v)) {
        return 'Must be a WebSocket URL (e.g. ws://localhost:4242 or wss://your-server.com)';
      }
      return null;
    }
  });
  if (url && url !== current) {
    await config.update('hubUrl', url, vscode.ConfigurationTarget.Global);
    webview.html = getWebviewHtml(webview, mediaPath);
  }
}

class VillageSidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  constructor(private readonly extensionPath: string) {}

  get view() { return this._view; }

  async resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;
    const mediaPath = path.join(this.extensionPath, 'media');

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(mediaPath)]
    };

    webviewView.webview.html = getWebviewHtml(webviewView.webview, mediaPath);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === 'changeHubUrl') await handleChangeHubUrl(webviewView.webview, mediaPath);
    });

    webviewView.onDidDispose(() => { this._view = undefined; });
  }

  refresh() {
    if (this._view) {
      const mediaPath = path.join(this.extensionPath, 'media');
      this._view.webview.html = getWebviewHtml(this._view.webview, mediaPath);
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  const sidebarProvider = new VillageSidebarProvider(context.extensionPath);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('agentVillage.sidebarView', sidebarProvider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('agentVillage.refresh', () => {
      sidebarProvider.refresh();
      if (panel) {
        const mediaPath = path.join(context.extensionPath, 'media');
        panel.webview.html = getWebviewHtml(panel.webview, mediaPath);
      }
    })
  );

  const command = vscode.commands.registerCommand('agentVillage.openViewer', async () => {
    if (panel) {
      panel.reveal();
      return;
    }

    const mediaPath = path.join(context.extensionPath, 'media');

    panel = vscode.window.createWebviewPanel(
      'agentVillageViewer',
      'The Agents',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.file(mediaPath)]
      }
    );

    panel.webview.html = getWebviewHtml(panel.webview, mediaPath);
    panel.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === 'changeHubUrl' && panel) await handleChangeHubUrl(panel.webview, mediaPath);
    });
    panel.onDidDispose(() => { panel = undefined; });
  });

  context.subscriptions.push(command);
}

export function deactivate() {}
