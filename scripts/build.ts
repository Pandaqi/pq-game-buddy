/**
 * Builds dist/ (app.js, app.css, index.html) and dist/pq-game-buddy.html.
 * Prints a size table and fails when a budget is exceeded.
 */

import { SveltePlugin } from 'bun-plugin-svelte';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '..');
const dist = join(root, 'dist');
const sizeFile = join(dist, 'size.json');

const BUDGET_APP_GZ = 120 * 1024;
const BUDGET_SINGLE_GZ = 350 * 1024;
const TARGET_SINGLE_GZ = 300 * 1024;

const sizeOnly = process.argv.includes('--size-only');

function gzipSize(text: string): number {
  return Bun.gzipSync(new TextEncoder().encode(text)).byteLength;
}

function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

interface SizeReport {
  js: number;
  css: number;
  appGz: number;
  single: number;
  singleGz: number;
  tools: number;
}

function verify(report: SizeReport): boolean {
  let ok = true;
  if (report.appGz > BUDGET_APP_GZ) {
    console.error(`[size] app is ${kb(report.appGz)} gzipped; the budget is ${kb(BUDGET_APP_GZ)}`);
    ok = false;
  }
  if (report.singleGz > BUDGET_SINGLE_GZ) {
    console.error(`[size] single file is ${kb(report.singleGz)} gzipped; the hard limit is ${kb(BUDGET_SINGLE_GZ)}`);
    ok = false;
  }
  if (report.singleGz > TARGET_SINGLE_GZ) {
    console.warn(`[size] single file is above the ${kb(TARGET_SINGLE_GZ)} target (still under the hard limit)`);
  }
  return ok;
}

if (sizeOnly) {
  if (!existsSync(sizeFile)) {
    console.error('[size] no dist/size.json yet. Run `bun run build` first.');
    process.exit(1);
  }
  const report = JSON.parse(readFileSync(sizeFile, 'utf8')) as SizeReport;
  console.log(
    `[size] app ${kb(report.appGz)} gz · single ${kb(report.singleGz)} gz · ${report.tools} tools`,
  );
  process.exit(verify(report) ? 0 : 1);
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const result = await Bun.build({
  entrypoints: [join(root, 'src', 'main.ts')],
  outdir: join(dist, 'raw'),
  naming: { entry: '[name].[ext]', chunk: 'chunk-[hash].[ext]', asset: 'asset-[hash].[ext]' },
  plugins: [SveltePlugin({ development: false })],
  minify: true,
  sourcemap: 'none',
  target: 'browser',
  splitting: false,
  define: { 'process.env.NODE_ENV': '"production"' },
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  console.error('[build] failed');
  process.exit(1);
}

let js = '';
let css = '';
for (const output of result.outputs) {
  const text = await output.text();
  if (output.path.endsWith('.js')) js += text;
  else if (output.path.endsWith('.css')) css += text + '\n';
}
if (!js) {
  console.error('[build] no JavaScript output');
  process.exit(1);
}

writeFileSync(join(dist, 'app.js'), js);
if (css) writeFileSync(join(dist, 'app.css'), css);
rmSync(join(dist, 'raw'), { recursive: true, force: true });

const shell = readFileSync(join(root, 'index.html'), 'utf8');
const scriptTag = /<script type="module" src="\/src\/main\.ts"><\/script>/;
if (!scriptTag.test(shell)) {
  console.error('[build] index.html no longer contains the entry script tag');
  process.exit(1);
}

const html = shell.replace(
  scriptTag,
  `<link rel="stylesheet" href="./app.css" />\n    <script type="module" src="./app.js"></script>`,
);
writeFileSync(join(dist, 'index.html'), html);

// One self-contained file: double-click, works offline.
const inline = shell
  .replace(scriptTag, `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`)
  .replace('</head>', `  <style>${css}</style>\n  </head>`);
writeFileSync(join(dist, 'pq-game-buddy.html'), inline);

const manifest = await Bun.file(join(root, 'src', 'core', 'manifest.generated.ts')).text();
const toolCount = (manifest.match(/^import tool_/gm) ?? []).length;

const report: SizeReport = {
  js: new TextEncoder().encode(js).byteLength,
  css: new TextEncoder().encode(css).byteLength,
  appGz: gzipSize(js) + gzipSize(css),
  single: new TextEncoder().encode(inline).byteLength,
  singleGz: gzipSize(inline),
  tools: toolCount,
};

writeFileSync(sizeFile, JSON.stringify(report, null, 2));

console.log('');
console.log('artifact                        raw        gzipped');
console.log('------------------------------  ---------  ---------');
console.log(`app.js                          ${kb(report.js).padEnd(10)} ${kb(gzipSize(js))}`);
console.log(`app.css                         ${kb(report.css).padEnd(10)} ${kb(gzipSize(css))}`);
console.log(`dist/index.html (js+css)        ${kb(report.js + report.css).padEnd(10)} ${kb(report.appGz)}`);
console.log(`pq-game-buddy.html              ${kb(report.single).padEnd(10)} ${kb(report.singleGz)}`);
console.log('');
console.log(`[build] ${toolCount} tools · dist ready`);
console.log('[build] single file: dist/pq-game-buddy.html');

process.exit(verify(report) ? 0 : 1);
