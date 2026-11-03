import fs from 'node:fs';
const root = 'D:/DeepSeek Harness WorkSpace/海南自贸港2026-H5';
const data = JSON.parse(fs.readFileSync(root + '/src/data/hainan-outline.json', 'utf8'));
const out = `window.HAINAN_OUTLINE = ${JSON.stringify({ viewBox: data.viewBox, points: data.points })};\n`;
fs.writeFileSync(root + '/js/hainan-outline.js', out, 'utf8');
console.log('wrote', out.length, JSON.stringify(out.slice(-24)));
