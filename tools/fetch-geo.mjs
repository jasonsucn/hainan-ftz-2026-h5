import fs from 'node:fs';

const urls = [
  'https://geo.datav.aliyun.com/areas_v3/bound/460000_full.json',
  'https://geo.datav.aliyun.com/areas_v3/bound/460000.json',
  'https://geojson.cn/api/data/460000.json',
];
for (const url of urls) {
  try {
    console.log('fetching', url);
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text.trim().startsWith('{')) throw new Error('not json');
    fs.mkdirSync('src/data', { recursive: true });
    fs.writeFileSync('src/data/hainan-raw.json', text);
    console.log('saved', text.length, 'bytes');
    process.exit(0);
  } catch (e) {
    console.error('failed', url, e.message);
  }
}
process.exit(1);
