/**
 * Builds the app in one of three shapes:
 *   --mode=spa     (default) one page, the shell plus a chunk per screen
 *   --mode=site    the same, plus dist/<tool>/index.html for every tool
 *   --mode=single  a single dist/index.html with JS and CSS embedded
 * The spa and site builds also write dist/pq-game-buddy.html, the offline copy.
 */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { svelteCompile } from './svelte-compile';

const root = join(import.meta.dir, '..');
const dist = join(root, 'dist');
const sizeFile = join(dist, 'size.json');
const shellFile = join(root, 'index.html');

// Ceilings, not targets. The start-up budget came down twice: views and pages
// became chunks for M4, then whole tool modules did (see ROADMAP.md §5.2). Now
// that a tool's code arrives with its chunk, the per-chunk ceiling is what one
// screen can cost, and the total keeps the deferred catalogue from sprawling.
// The single file has no ceiling: it is the whole app in one file.
const BUDGET_APP_GZ = 150 * 1024;
const BUDGET_CHUNK_GZ = 24 * 1024;
const BUDGET_CHUNKS_TOTAL_GZ = 250 * 1024;

const MODES = ['spa', 'site', 'single'] as const;
type Mode = (typeof MODES)[number];

const sizeOnly = process.argv.includes('--size-only');
const modeArg = process.argv.find((arg) => arg.startsWith('--mode='));
const mode = (modeArg ? modeArg.slice('--mode='.length) : 'spa') as Mode;
if (!MODES.includes(mode)) {
  console.error(`[build] unknown --mode "${mode}"; use ${MODES.join(', ')}`);
  process.exit(1);
}

interface SizeReport {
  mode: Mode;
  js: number;
  css: number;
  appGz: number;
  chunks: { count: number; largest: string; largestGz: number; totalGz: number };
  single: number;
  singleGz: number;
  tools: number;
}

function gzipSize(text: string): number {
  return Bun.gzipSync(new TextEncoder().encode(text)).byteLength;
}

function rawSize(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function verify(report: SizeReport): boolean {
  if (report.mode === 'single') return true;
  let ok = true;
  if (report.appGz > BUDGET_APP_GZ) {
    console.error(`[size] the app starts at ${kb(report.appGz)} gzipped; the budget is ${kb(BUDGET_APP_GZ)}`);
    ok = false;
  }
  if (report.chunks.largestGz > BUDGET_CHUNK_GZ) {
    console.error(
      `[size] the chunk ${report.chunks.largest} is ${kb(report.chunks.largestGz)} gzipped; one screen may cost at most ${kb(BUDGET_CHUNK_GZ)}`,
    );
    ok = false;
  }
  if (report.chunks.totalGz > BUDGET_CHUNKS_TOTAL_GZ) {
    console.error(
      `[size] the deferred chunks total ${kb(report.chunks.totalGz)} gzipped; the budget is ${kb(BUDGET_CHUNKS_TOTAL_GZ)}`,
    );
    ok = false;
  }
  return ok;
}

if (sizeOnly) {
  if (!existsSync(sizeFile)) {
    console.error('[size] no dist/size.json yet. Run `bun run build` first.');
    process.exit(1);
  }
  const report = JSON.parse(readFileSync(sizeFile, 'utf8')) as SizeReport;
  const where = report.mode === 'single' ? `single ${kb(report.singleGz)} gz` : `start-up ${kb(report.appGz)} gz · ${report.chunks.count} chunks`;
  console.log(`[size] ${where} · ${report.tools} tools · mode ${report.mode}`);
  process.exit(verify(report) ? 0 : 1);
}

interface Output {
  path: string;
  text: string;
}

function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

async function bundle(outdir: string, splitting: boolean): Promise<Output[]> {
  const result = await Bun.build({
    entrypoints: [join(root, 'src', 'main.ts')],
    outdir,
    naming: {
      entry: 'app.[ext]',
      chunk: 'chunks/[name]-[hash].[ext]',
      asset: 'assets/[name]-[hash].[ext]',
    },
    plugins: [svelteCompile()],
    minify: true,
    sourcemap: 'none',
    target: 'browser',
    splitting,
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    console.error('[build] failed');
    process.exit(1);
  }
  const outputs: Output[] = [];
  for (const output of result.outputs) outputs.push({ path: output.path, text: await output.text() });
  return outputs;
}

function entryOf(outputs: Output[]): string {
  return outputs.find((output) => baseName(output.path) === 'app.js')?.text ?? '';
}

function cssOf(outputs: Output[]): string {
  return outputs
    .filter((output) => output.path.endsWith('.css'))
    .map((output) => output.text)
    .join('\n');
}

/** Paths the browser requests before the first paint. Only `import … from` counts. */
function staticRefs(js: string): string[] {
  const refs: string[] = [];
  for (const match of js.matchAll(/(?:^|[^\w$])(?:import|from)\s*["'](\.\/[^"']+\.js)["']/g)) {
    refs.push(match[1]);
  }
  return refs;
}

/**
 * Everything the entry pulls in with static imports. Bun hoists code shared by
 * the shell and a lazy chunk into a chunk of its own, so counting `app.js` alone
 * would under-report what a first visit downloads.
 */
function startupClosure(files: Map<string, string>, entry: string): string[] {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length) {
    const next = queue.pop() as string;
    if (seen.has(next)) continue;
    seen.add(next);
    for (const ref of staticRefs(files.get(next) ?? '')) {
      const resolved = ref.replace(/^\.\//, '');
      if (files.has(resolved)) queue.push(resolved);
    }
  }
  return [...seen];
}

const shell = readFileSync(shellFile, 'utf8');
const scriptTag = /<script type="module" src="\/src\/main\.ts"><\/script>/;
if (!scriptTag.test(shell)) {
  console.error('[build] index.html no longer contains the entry script tag');
  process.exit(1);
}

/** One file, nothing else: double-click it, copy it around, attach it to a chat. */
function embedded(js: string, css: string): string {
  return shell
    .replace(scriptTag, `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`)
    .replace('</head>', `  <style>${css}</style>\n  </head>`);
}

const manifest = await Bun.file(join(root, 'src', 'core', 'manifest.generated.ts')).text();
const toolCount = (manifest.match(/^import meta_/gm) ?? []).length;
if (!toolCount) {
  console.error('[build] no tools found in the generated manifest');
  process.exit(1);
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

/** Static files the hosted build serves as-is: the manifest, the icon, the worker. */
function copyPublic(): void {
  const publicDir = join(root, 'public');
  if (existsSync(publicDir)) cpSync(publicDir, dist, { recursive: true });
}

const scratch = join(dist, '.single');

if (mode === 'single') {
  const outputs = await bundle(scratch, false);
  const js = entryOf(outputs);
  const css = cssOf(outputs);
  if (!js) {
    console.error('[build] no JavaScript output');
    process.exit(1);
  }
  const file = embedded(js, css);
  writeFileSync(join(dist, 'index.html'), file);
  rmSync(scratch, { recursive: true, force: true });

  // One file is the whole point of this mode: no size.json, no other output.
  console.log('');
  console.log(`dist/index.html                ${kb(rawSize(file)).padEnd(10)} ${kb(gzipSize(file))}  (one file, nothing else)`);
  console.log('');
  console.log(`[build] ${toolCount} tools · mode single · dist ready`);
  process.exit(0);
}

// Hosted build: the shell, the chunks it shares with lazy screens, and one chunk per screen.
copyPublic();
const hosted = await bundle(dist, true);
const files = new Map<string, string>();
for (const output of hosted) {
  files.set(output.path.slice(dist.length + 1).split(/[\\/]/).join('/'), output.text);
}

const entryJs = files.get('app.js') ?? '';
if (!entryJs) {
  console.error('[build] no entry JavaScript output');
  process.exit(1);
}
const css = files.get('app.css') ?? '';
const startup = startupClosure(files, 'app.js');
const startupJs = startup.map((file) => files.get(file) ?? '');
const chunks = [...files.keys()]
  .filter((file) => file.endsWith('.js') && !startup.includes(file))
  .sort();

const hostedHtml = shell.replace(
  scriptTag,
  `<link rel="manifest" href="./manifest.webmanifest" />\n    <meta name="pq-pwa" content="1" />\n    <link rel="stylesheet" href="./app.css" />\n    <script type="module" src="./app.js"></script>`,
);
writeFileSync(join(dist, 'index.html'), hostedHtml);

if (mode === 'site') {
  const pages = await toolPages();
  for (const page of pages) {
    mkdirSync(join(dist, page.id), { recursive: true });
    writeFileSync(join(dist, page.id, 'index.html'), toolPage(hostedHtml, page));
  }
  console.log(`[build] ${pages.length} tool pages: dist/<tool>/index.html`);
}

const single = await bundle(scratch, false);
const singleJs = entryOf(single);
const singleCss = cssOf(single);
rmSync(scratch, { recursive: true, force: true });
if (!singleJs) {
  console.error('[build] no JavaScript output for the offline copy');
  process.exit(1);
}
const inline = embedded(singleJs, singleCss);
writeFileSync(join(dist, 'pq-game-buddy.html'), inline);

const chunkSizes = chunks
  .map((file) => ({ name: baseName(file), gz: gzipSize(files.get(file) ?? '') }))
  .sort((a, b) => b.gz - a.gz);

const report: SizeReport = {
  mode,
  js: startupJs.reduce((sum, text) => sum + rawSize(text), 0),
  css: rawSize(css),
  appGz: startupJs.reduce((sum, text) => sum + gzipSize(text), 0) + gzipSize(css),
  chunks: {
    count: chunkSizes.length,
    largest: chunkSizes[0]?.name ?? '',
    largestGz: chunkSizes[0]?.gz ?? 0,
    totalGz: chunkSizes.reduce((sum, chunk) => sum + chunk.gz, 0),
  },
  single: rawSize(inline),
  singleGz: gzipSize(inline),
  tools: toolCount,
};

writeFileSync(sizeFile, JSON.stringify(report, null, 2));

const startupGz = report.appGz - gzipSize(css);
console.log('');
console.log('artifact                        raw        gzipped');
console.log('------------------------------  ---------  ---------');
console.log(`${`start-up JS (${startup.length} files)`.padEnd(30)}  ${kb(report.js).padEnd(10)} ${kb(startupGz)}`);
console.log(`${'app.css (tokens and base only)'.padEnd(30)}  ${kb(report.css).padEnd(10)} ${kb(gzipSize(css))}`);
console.log(`${'first visit (js+css)'.padEnd(30)}  ${kb(report.js + report.css).padEnd(10)} ${kb(report.appGz)}`);
console.log(`${`${report.chunks.count} lazy chunks`.padEnd(30)}  ${kb(report.chunks.totalGz).padEnd(10)} largest ${kb(report.chunks.largestGz)}`);
console.log(`${'pq-game-buddy.html'.padEnd(30)}  ${kb(report.single).padEnd(10)} ${kb(report.singleGz)}`);
console.log('');
console.log(`[build] ${toolCount} tools · mode ${mode} · dist ready`);
console.log('[build] offline copy: dist/pq-game-buddy.html');

process.exit(verify(report) ? 0 : 1);

interface PageMeta {
  id: string;
  title: string;
  blurb: string;
  tags: string[];
}

/** Tool metadata straight from the source, so a page needs no runtime lookup. */
async function toolPages(): Promise<PageMeta[]> {
  const toolsDir = join(root, 'src', 'tools');
  const pages: PageMeta[] = [];
  for (const entry of readdirSync(toolsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const metaFile = join(toolsDir, entry.name, 'meta.ts');
    if (!existsSync(metaFile)) continue;
    const module = (await import(pathToFileURL(metaFile).href)) as { default?: PageMeta };
    const meta = module.default;
    if (!meta?.id || meta.id !== entry.name) continue;
    if ((meta.tags ?? []).includes('dev')) continue;
    pages.push(meta);
  }
  return pages.sort((a, b) => a.id.localeCompare(b.id));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** One tool, one folder, one page: the app boots straight into that tool. */
function toolPage(html: string, meta: PageMeta): string {
  const page = html
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(meta.title)} — Game Buddy</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escapeHtml(meta.blurb)}$2`)
    .replace('href="./app.css"', 'href="../app.css"')
    .replace('src="./app.js"', 'src="../app.js"')
    .replace('href="./manifest.webmanifest"', 'href="../manifest.webmanifest"')
    .replace('<body>', `<body data-tool="${escapeHtml(meta.id)}">`);
  const built =
    page.includes('src="../app.js"') && page.includes(`data-tool="${escapeHtml(meta.id)}"`);
  if (!built) {
    console.error(`[build] could not build the page for "${meta.id}"`);
    process.exit(1);
  }
  return page;
}
