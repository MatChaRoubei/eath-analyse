import { readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

const project = resolve(import.meta.dirname, '..');
const dist = join(project, 'dist');
const htmlFile = join(dist, 'index.html');
try { await readFile(htmlFile); }
catch { await rename(join(dist, 'app.html'), htmlFile); }
const html = await readFile(htmlFile, 'utf8');
const icon = (await readFile(join(dist, 'atlas-icon.svg'), 'utf8')).trim();
const iconDataUri = `data:image/svg+xml,${encodeURIComponent(icon)}`;
const scriptMatch = html.match(/<script type="module" crossorigin src="\.\/assets\/([^"]+)"><\/script>/);
const cssMatch = html.match(/<link rel="stylesheet" crossorigin href="\.\/assets\/([^"]+)">/);
if (!scriptMatch || !cssMatch) throw new Error('找不到打包后的脚本或样式');

const js = await readFile(join(dist, 'assets', scriptMatch[1]), 'utf8');
const css = await readFile(join(dist, 'assets', cssMatch[1]), 'utf8');
if (/import\.meta|^\s*import\s/m.test(js) || /<\/script/i.test(js) || /<\/style/i.test(css)) {
  throw new Error('打包产物包含无法直接嵌入的代码');
}

async function allFiles(folder) {
  const out = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) out.push(...await allFiles(path));
    else out.push(path);
  }
  return out;
}

const dataFiles = (await allFiles(join(dist, 'data')))
  .filter(path => /\.(geojson|json)$/i.test(path));
const embeddedData = [];
for (const path of dataFiles) {
  const key = relative(join(dist, 'data'), path).split(sep).join('/');
  const content = await readFile(path, 'utf8');
  JSON.parse(content);
  const safe = content.replace(/<\/script/gi, '<\\/script');
  embeddedData.push(`<script type="application/json" data-atlas-asset="${key}">${safe}</script>`);
}

const texture = (await readFile(join(dist, 'data', 'earth-blue-marble.jpg'))).toString('base64');
const bootstrap = `<script>
window.__ATLAS_TEXTURE__='data:image/jpeg;base64,${texture}';
const atlasFiles = new Map([...document.querySelectorAll('[data-atlas-asset]')].map(node => [node.dataset.atlasAsset, node]));
const realFetch = window.fetch.bind(window);
window.fetch = (input, options) => {
  const address = new URL(input instanceof Request ? input.url : input, location.href);
  if (address.protocol === 'file:') {
    const marker = '/data/';
    const position = address.pathname.lastIndexOf(marker);
    const name = position < 0 ? '' : decodeURIComponent(address.pathname.slice(position + marker.length));
    const node = atlasFiles.get(name);
    if (node) return Promise.resolve(new Response(node.textContent, { status: 200, headers: { 'Content-Type': 'application/json' } }));
  }
  return realFetch(input, options);
};
</script>`;

const offline = html
  .replace(scriptMatch[0], '')
  .replace(cssMatch[0], `<style>${css}</style>`)
  .replace('href="./atlas-icon.svg"', `href="${iconDataUri}"`)
  .replace(/<a href="data\/SOURCES\.md"[^>]*>来源与许可 ↗<\/a> · /, '')
  .replace('</body>', `${embeddedData.join('\n')}\n${bootstrap}\n<script>${js}</script>\n</body>`);

const output = join(project, 'index.html');
await writeFile(output, offline, 'utf8');
console.log(`已生成 ${output}，嵌入 ${dataFiles.length} 个数据文件，${(Buffer.byteLength(offline) / 1024 / 1024).toFixed(1)} MB`);
