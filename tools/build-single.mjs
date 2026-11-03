import fs from 'node:fs';
import path from 'node:path';

const root = 'D:/DeepSeek Harness WorkSpace/海南自贸港2026-H5';
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

html = html.replace(
  '<link rel="stylesheet" href="styles.css">',
  () => `<style>\n${css}\n</style>`
);

const scripts = [
  'js/hainan-outline.js',
  'js/thread.js',
  'js/seal.js',
  'js/main.js',
];

for (const file of scripts) {
  const code = fs.readFileSync(path.join(root, file), 'utf8');
  const tag = `<script src="${file}"></script>`;
  if (!html.includes(tag)) throw new Error(`missing ${tag}`);
  html = html.replace(tag, () => `<script>\n${code}\n</script>`);
}

html = html.replace(
  '<head>',
  '<head>\n  <!-- Single-file build. Assets stay in ./assets; generated from index.html + styles.css + js/*.js. -->'
);

const out = path.join(root, '海南自贸港2026.html');
fs.writeFileSync(out, html, 'utf8');
console.log('wrote', out, (html.length / 1024).toFixed(1), 'KB');
