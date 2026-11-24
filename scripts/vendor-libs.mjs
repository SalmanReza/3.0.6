// v3.0.6: makes the two offline copies the app ships in src/vendor/ from the exact npm packages
// (devDependencies, pinned). Run: node scripts/vendor-libs.mjs   (tests/v306.test.js checks the
// committed copies are exactly what this script produces).
//
// 1. moon-sighting 1.2.0 (MIT, Aric Camarata) -> src/vendor/moon-sighting.js
//    Only REMOVALS plus one export list; no maths is changed:
//    - the bundled @acamarata/telemetry block and the load-time telemetry call (it is off by
//      default, but it contains a fetch() to ping.ariccamarata.com);
//    - kernel download/verify code and the url/file/auto kernel sources (fetch, fs, process);
//    - SpkKernel.fromFile (Node fs).
//    The kernel can only be given as an in-memory buffer (the bundled de442s.bsp).
//    Internal functions the app needs (time scales, kernel states, topocentric az/alt,
//    illumination, horizon crossings, Odeh/Yallop) are added to the export list.
// 2. @photostructure/tz-lookup 11.8.0 (CC0-1.0) -> src/vendor/tz-lookup.js
//    The CommonJS line is replaced by an ES module export; nothing else changes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nm = p => path.join(root, 'node_modules', p);

export function vendorMoonSighting(src) {
  const cut = (text, startMarker, endMarker, replacement = '') => {
    const a = text.indexOf(startMarker);
    const b = text.indexOf(endMarker, a + startMarker.length);
    if (a < 0 || b < 0) throw new Error(`vendor: marker not found: ${startMarker.slice(0, 40)}`);
    return text.slice(0, a) + replacement + text.slice(b);
  };
  let t = src;
  // helpers only used by telemetry / fromFile
  t = cut(t, 'var __require = ', 'var __publicField = ');
  t = t.replace('var __getOwnPropNames = Object.getOwnPropertyNames;\n', '');
  // telemetry block
  t = cut(t, '// node_modules/.pnpm/@acamarata+telemetry', '// src/types.ts');
  // SpkKernel.fromFile
  t = cut(t, '  /** Load a kernel from a file path (Node.js only). */', '  /**\n   * Compute the state vector');
  // kernel loading: buffer only
  t = cut(t, 'var activeKernel = null;', 'async function getMoonSightingReport(', `var activeKernel = null;
/* vendored (Prayer Times v3.0.6): offline only. The kernel must be supplied as an in-memory buffer. */
async function initKernels(config) {
  const source = config?.planetary;
  if (!source || source.type !== "buffer") throw new Error("moon-sighting (offline copy): give the kernel as { planetary: { type: 'buffer', data } }");
  activeKernel = SpkKernel.fromBuffer(source.data);
  return activeKernel;
}
function setKernel(kernel) {
  activeKernel = kernel;
}
function getKernel() {
  return activeKernel;
}
async function resolveKernel(config) {
  if (config?.planetary?.type === "buffer") return SpkKernel.fromBuffer(config.planetary.data);
  if (activeKernel) return activeKernel;
  throw new Error("Kernel not loaded. Call initKernels() with the bundled kernel buffer first.");
}
`);
  // load-time telemetry call
  t = cut(t, '// src/index.ts\n', 'export {', '// src/index.ts (load-time telemetry call removed)\n');
  t = t.replace('  downloadKernels,\n', '').replace('  verifyKernels\n', '  NAIF_IDS,\n  SpkKernel,\n  computeTimeScales,\n  jdTTtoET,\n  dateToJD,\n  getMoonGeocentricState,\n  getSunGeocentricState,\n  computeAzAlt,\n  computeIllumination,\n  computeCrescentGeometry,\n  computeCrescentWidth,\n  computeOdeh,\n  computeYallop,\n  findAltitudeCrossing,\n  bestTimeHeuristic,\n  geodeticToECEF,\n  itrsToGcrs,\n  previousNewMoon,\n  nearestNewMoon,\n  setKernel,\n  getKernel\n');
  t = t.replace(/\n\/\/# sourceMappingURL=.*\n?$/, '\n');
  for (const bad of ['fetch(', 'process.', 'require(', 'XMLHttpRequest', 'WebSocket', 'http://', 'https://', 'import(']) {
    if (t.includes(bad)) throw new Error(`vendor: network/Node code left: ${bad}`);
  }
  const header = `/* moon-sighting 1.2.0 (https://www.npmjs.com/package/moon-sighting) by Aric Camarata, MIT licence
   (full text in src/vendor/LICENSES-v3.0.6.txt and LICENSES). Offline copy made by scripts/vendor-libs.mjs:
   telemetry, kernel download and file access removed; internal functions exported. No maths changed. */
`;
  return header + t;
}

export function vendorTzLookup(src) {
  const line = '"undefined"!=typeof module&&(module.exports=tzlookup);';
  if (!src.includes(line)) throw new Error('vendor: tz-lookup export line not found');
  return `/* @photostructure/tz-lookup 11.8.0, CC0-1.0 (public domain dedication). Offline copy made by
   scripts/vendor-libs.mjs: only the CommonJS export line is replaced by an ES module export. */
` + src.replace(line, 'export default tzlookup;');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ms = fs.readFileSync(nm('moon-sighting/dist/index.mjs'), 'utf8');
  fs.writeFileSync(path.join(root, 'src/vendor/moon-sighting.js'), vendorMoonSighting(ms));
  const tz = fs.readFileSync(nm('@photostructure/tz-lookup/tz.js'), 'utf8');
  fs.writeFileSync(path.join(root, 'src/vendor/tz-lookup.js'), vendorTzLookup(tz));
  console.log('vendored moon-sighting and tz-lookup');
}
