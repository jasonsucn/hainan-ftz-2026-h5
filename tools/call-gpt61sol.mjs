import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const promptPath = arg('prompt');
const outPath = arg('out');
const instructionsPath = arg('instructions');
if (!promptPath || !outPath) {
  console.error('usage: node call-gpt61sol.mjs --prompt <file> --out <file> [--instructions <file>]');
  process.exit(2);
}

const credPath = path.join(os.homedir(), '.dsh', '.credentials.yaml');
const cred = fs.readFileSync(credPath, 'utf8');
const key = cred.match(/GPT_6_SOL_API_KEY:\s*(\S+)/)?.[1];
if (!key) throw new Error('GPT_6_SOL_API_KEY not found');

const input = fs.readFileSync(promptPath, 'utf8');
const instructions = instructionsPath
  ? fs.readFileSync(instructionsPath, 'utf8')
  : '你是世界顶级数字体验艺术总监兼创意技术总监。你只输出可执行的设计判断与具体规格，不写空泛的赞美。';

const body = {
  model: 'gpt-6.1-sol',
  instructions,
  input,
  reasoning: { effort: 'max' },
  max_output_tokens: 14000,
};

const started = Date.now();
const res = await fetch('https://api.token5u.cn/v1/responses', {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const text = await res.text();
if (!res.ok) {
  fs.writeFileSync(outPath.replace(/\.md$/, '.error.json'), text);
  throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
}
const json = JSON.parse(text);
fs.writeFileSync(outPath.replace(/\.md$/, '.raw.json'), JSON.stringify(json, null, 2));

let output = '';
if (typeof json.output_text === 'string') output = json.output_text;
if (!output && Array.isArray(json.output)) {
  for (const item of json.output) {
    if (item.type === 'message' && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (c.type === 'output_text' && typeof c.text === 'string') output += c.text;
      }
    }
  }
}
if (!output) output = JSON.stringify(json.output ?? json, null, 2);
fs.writeFileSync(outPath, output);
console.log(JSON.stringify({
  ok: true,
  outPath,
  elapsedSec: Math.round((Date.now() - started) / 1000),
  chars: output.length,
  usage: json.usage ?? null,
}));
