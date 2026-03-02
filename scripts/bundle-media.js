// Copies viewer + assets into media/ for self-contained extension packaging.

const fs = require('fs');
const path = require('path');

const HUB = path.join(__dirname, '..', '..', 'The-Agents-Hub', 'public');
const MEDIA = path.join(__dirname, '..', 'media');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Clean
fs.rmSync(MEDIA, { recursive: true, force: true });
fs.mkdirSync(MEDIA, { recursive: true });

// Viewer files
copyDir(path.join(HUB, 'viewer'), path.join(MEDIA, 'viewer'));

// Assets — copy what exists (tilesets are fetched from hub at runtime)
for (const dir of ['characters', 'animated']) {
  const src = path.join(HUB, 'assets', dir);
  if (fs.existsSync(src)) copyDir(src, path.join(MEDIA, 'assets', dir));
}

console.log('Media bundled into vscode-extension/media/');
