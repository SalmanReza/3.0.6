// Generates the v2.3.0 Prayer Times logo (option B: gold crescent and star over astrolabe rete rings, silver ring, dark enamel face)
// and writes: src/branding.js (BRAND_MARK_SVG), index.html header mark, src-tauri/icons/icon.svg, public/favicon.svg,
// and the Tauri PNG / ICO set (rendered by headless Chrome, transparent background).
import fs from 'node:fs';
import { launch } from './lib.mjs';
const root = new URL('../', import.meta.url).pathname;
// v2.3.0: the artwork is option B (scripts/logo-b.svg): gold crescent and star over astrolabe rete rings, silver ring, dark enamel face.
const src = fs.readFileSync(new URL('./logo-b.svg', import.meta.url), 'utf8');
const body = src.replace(/^<svg[^>]*>\n?/, '').replace(/\n?<\/svg>\s*$/, '');
const header = `<svg viewBox="0 0 512 512" focusable="false">${body.replace(/<!--[^>]*-->\n?/g, '').replace(/\n/g, '')}</svg>`;
const standalone = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">\n${body}\n</svg>\n`;
// comment markers the tests look for are kept in the standalone file: suspension-free design, limb, mihrab, crescent
fs.writeFileSync(root + 'src-tauri/icons/icon.svg', standalone);
fs.writeFileSync(root + 'public/favicon.svg', standalone);
let br = fs.readFileSync(root + 'src/branding.js', 'utf8');
br = br.replace(/export const BRAND_MARK_SVG = '[\s\S]*?';\n/, () => `export const BRAND_MARK_SVG = '${header.replace(/'/g, "\\'")}';\n`);
br = br.replace(/\/\* v2\.[0-9.]+ logo:[\s\S]*?\*\//, `/* v2.3.0 logo: a gold crescent and star over fine astrolabe rete rings, inside a brushed-silver ring with degree ticks and a dark enamel face
   (the language of the astrolabe and the clock). The same artwork is src-tauri/icons/icon.svg, public/favicon.svg and the header mark in index.html;
   scripts/gen-logo.mjs regenerates all of them and the Tauri PNG/ICO set from scripts/logo-b.svg. */`);
fs.writeFileSync(root + 'src/branding.js', br);
let html = fs.readFileSync(root + 'index.html', 'utf8');
html = html.replace(/(<div class="brand-mark" id="brandMark" aria-hidden="true">)[\s\S]*?(<\/div>\s*<div class="brand-copy">)/, (m, a1, a2) => a1 + header + a2);
fs.writeFileSync(root + 'index.html', html);
// raster set
const b = await launch();
const png = async size => {
  const p = await b.newPage(); await p.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await p.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${standalone}`);
  const buf = await p.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } }); await p.close(); return buf;
};
const out = root + 'src-tauri/icons/';
for (const [name, size] of [['32x32.png', 32], ['128x128.png', 128], ['128x128@2x.png', 256], ['icon.png', 512]]) fs.writeFileSync(out + name, await png(size));
const sizes = [16, 24, 32, 48, 64, 128, 256]; const imgs = [];
for (const s of sizes) imgs.push([s, await png(s)]);
const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(imgs.length, 4);
let offset = 6 + 16 * imgs.length; const dirs = [], datas = [];
for (const [s, buf] of imgs) { const d = Buffer.alloc(16); d[0] = s === 256 ? 0 : s; d[1] = s === 256 ? 0 : s; d.writeUInt16LE(1, 4); d.writeUInt16LE(32, 6); d.writeUInt32LE(buf.length, 8); d.writeUInt32LE(offset, 12); offset += buf.length; dirs.push(d); datas.push(buf); }
fs.writeFileSync(out + 'icon.ico', Buffer.concat([head, ...dirs, ...datas]));
await b.close();
console.log('logo written; ICO sizes', sizes.join(','));
