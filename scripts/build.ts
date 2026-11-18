/**
 * Builds the app in one of three shapes:
 *   --mode=spa     (default) one page, the shell plus a chunk per screen
 *   --mode=site    the same, plus dist/<tool>/index.html for every tool
 *   --mode=single  a single dist/index.html with JS and CSS embedded
 * The spa and site builds also write dist/pq-game-buddy.html, the offline copy.
 */

import type { BunPlugin } from 'bun';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { TemplateSummary } from '../src/data/template-summary';
import { svelteCompile } from './svelte-compile';

const root = join(import.meta.dir, '..');
const dist = join(root, 'dist');
const sizeFile = join(dist, 'size.json');
const shellFile = join(root, 'index.html');
/** Where the site build lives: the canonical URL every generated page declares. */
const SITE_ORIGIN = (process.env.PQGB_ORIGIN ?? 'https://pandaqi.com/game-buddy').replace(/\/$/, '');
/** The one social card, at the site root beside the icon: 1200 × 630, the size cards ask for. */
const OG_IMAGE = `${SITE_ORIGIN}/og.jpg`;
/** The front page's own words: what the app is, in the order a stranger asks. */
const HOME_DESCRIPTION =
  'Free, offline tools for game night: timers, dice, scorepads, secret roles, brackets,' +
  ' word helpers and 86 ready-to-play templates. One page, no account, no internet.';
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version as string;

// Ceilings, not targets. The start-up budget came down twice: views and pages
// became chunks for M4, then whole tool modules did (see ROADMAP.md §5.2). Now
// that a tool's code arrives with its chunk, the per-chunk ceiling is what one
// screen can cost, and the total keeps the deferred catalogue from sprawling.
// The single file has no ceiling: it is the whole app in one file.
// M12 moved the first visit from 150 KB to 180 KB once: the owner's brand art landed
// (a 9 KB hero wash and the badge inline at about 6 KB) and the display face changed
// from Dosis (21 KB subset) to Game Buddy (29 KB, Latin-1), 8 KB more. Both are
// finished surface, not slack; the arithmetic is in ROADMAP.md §5.2.
const BUDGET_APP_GZ = 180 * 1024;
// M13 raised the per-chunk ceiling once, from 24 KB to 26 KB: with ten languages the
// words chunk is 25.2 KB (its view, logic, ten language string sets and ten word packs)
// against 21.5 KB with five, or 0.74 KB per language. The arithmetic is in
// ROADMAP.md §5.2.
const BUDGET_CHUNK_GZ = 26 * 1024;
// M10 raised this ceiling once, from 250 KB, when German, Spanish and French
// landed beside English and Dutch: five languages at about 22 KB each are
// 302.6 KB across 42 chunks, so the ceiling is 320 KB. A sixth language needs its
// own arithmetic in ROADMAP.md §5.2 before it moves again.
// M11 raised it once more, to 336 KB: the tool-file runtime is one 6.8 KB chunk
// plus about 0.3 KB in each of four tool-text chunks, and the previous ceiling had
// 0.4 KB of headroom. The arithmetic is in ROADMAP.md §5.2.
// M13 raised it once more, to 464 KB: Portuguese, Italian, Indonesian, Turkish and
// Vietnamese cost 118.3 KB, or 23.7 KB each, which is 335.9 + 118.3 = 454.2 KB across
// 58 chunks. That leaves 9.8 KB, less than one more language, so the next one needs its
// own arithmetic in ROADMAP.md §5.2. It is a fixed amount of finished surface, not slack.
// The word bank then tripled: every pack became its own chunk and each grew from about
// 3.7 KB raw to 11.9 KB, so the total went 454.2 → 498.3 KB across 68 chunks while the
// largest chunk fell from 25.2 KB to 16.0 KB, because ten packs no longer ride in the
// words tool's chunk. That is 44.1 KB of finished data, so the ceiling moved once to
// 512 KB; the arithmetic is in ROADMAP.md §5.2.
// M13.7 raised it once more, to 620 KB: Polish, Japanese, Chinese (Simplified) and
// Korean cost 104.3 KB together, or 26.1 KB each (a 15.8–16.2 KB tool-text chunk, a
// 7.9–8.1 KB shell chunk and a 1.6–2.4 KB word pack), which is 498.3 + 104.3 =
// 602.6 KB across 80 chunks. That leaves 17.4 KB, less than one more language, so the
// next one needs its own arithmetic in ROADMAP.md §5.2. The per-chunk ceiling did not
// move: the largest chunk is the Polish tool-text one at 16.2 KB.
const BUDGET_CHUNKS_TOTAL_GZ = 620 * 1024;

const MODES = ['spa', 'site', 'single'] as const;
type Mode = (typeof MODES)[number];

/**
 * `--langs=nl` (or `nl,de`) drops every other language chunk from the build, so a
 * hosted copy or a single file can carry one language and be smaller for it.
 * Every language is a chunk, so a build carries exactly what it is asked for; the
 * app boots into whatever arrived and only offers the languages actually shipped.
 */
const langsArg = process.argv.find((arg) => arg.startsWith('--langs='));
const requestedLangs = langsArg
  ? langsArg
      .slice('--langs='.length)
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  : null;

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
  langs: string[];
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

/**
 * Drops the language loaders a `--langs` build does not ask for. The registry is
 * one line per language, so a filtered copy is a rewrite of those lines and every
 * unshipped chunk disappears from the output.
 */
function localeFilter(keep: string[]): BunPlugin {
  return {
    name: 'pqgb-locales',
    setup(build) {
      build.onLoad({ filter: /core[\\/]locales[\\/]registry\.generated\.ts$/ }, async (args) => {
        const source = await Bun.file(args.path).text();
        const contents = source
          .split('\n')
          .filter((line) => {
            const match = line.match(/^ {2}([a-z]{2}): \(\) => import\(/);
            return !match || keep.includes(match[1]);
          })
          .join('\n');
        return { contents, loader: 'ts' };
      });
    },
  };
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
    plugins: [...(requestedLangs ? [localeFilter(requestedLangs)] : []), svelteCompile()],
    // Bun's CSS bundler turns any url() asset under 128 KB into a base64 data URL,
    // which is a hard-coded threshold (oven-sh/bun#24599). The faces are files on
    // purpose, so they are external: the CSS keeps the relative path the source
    // wrote and this script copies the .woff2 beside the app.
    external: ['*.woff2'],
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
  for (const output of result.outputs) {
    // Fonts and pictures are written next to the bundle; only JS and CSS are text this
    // script reads back. An embedded build reads those assets from disk instead.
    if (!/\.(?:js|css)$/.test(output.path)) continue;
    outputs.push({ path: output.path, text: await output.text() });
  }
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

/** Where the source faces live; a tool's CSS never names them. */
const fontSourceDir = join(root, 'src', 'core', 'styles', 'fonts');
/** The stylesheet's own folder: an embedded build resolves `./fonts/…` from here. */
const styleSourceDir = join(root, 'src', 'core', 'styles');

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

/** The types an embedded build may have to carry: a face the CSS names lives next to it. */
const ASSET_TYPES: Record<string, string> = {
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

/**
 * A single HTML file has no siblings, so every asset its CSS points at is read from the
 * bundle output and inlined as a data URL. Only the embedded builds do this: the hosted
 * build keeps the fonts as files a browser downloads once and caches, and the copy it
 * also writes as `pq-game-buddy.html` has to stay self-contained to work from file://.
 */
function inlineCssAssets(css: string, bases: string[]): string {
  return css.replace(/url\((["']?)([^"')]+)\1\)/g, (whole, _quote: string, ref: string) => {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref)) return whole;
    const relative = ref.replace(/^\.?\//, '');
    const file = bases.map((base) => join(base, relative)).find((candidate) => existsSync(candidate));
    if (!file) return whole;
    const type = ASSET_TYPES[extname(file).toLowerCase()];
    if (!type) return whole;
    return `url("data:${type};base64,${readFileSync(file).toString('base64')}")`;
  });
}

// What this build can offer, read from the same registry the bundle uses.
const registryText = await Bun.file(join(root, 'src', 'core', 'locales', 'registry.generated.ts')).text();
// Both loader maps list languages (the shell's and the tools'); one id each.
const shippedLangs = [
  ...new Set(
    [...registryText.matchAll(/^ {2}([a-z]{2}): \(\) => import\(/gm)].map((match) => match[1]),
  ),
];
if (requestedLangs) {
  const unknown = requestedLangs.filter((id) => !shippedLangs.includes(id));
  if (unknown.length) {
    console.error(`[build] unknown language ${unknown.join(', ')}; this build has ${shippedLangs.join(', ')}`);
    process.exit(1);
  }
}
const buildLangs = requestedLangs ?? shippedLangs;

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

/** The two faces, beside the app: `app.css` asks for `./fonts/<name>.woff2`. */
function copyFonts(): void {
  cpSync(fontSourceDir, join(dist, 'fonts'), { recursive: true });
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
  const file = embedded(js, inlineCssAssets(css, [scratch, styleSourceDir]));
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
copyFonts();
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

// The tab icon is injected here with the manifest, not written in the shell: a favicon
// needs a URL to live at, and only a hosted build has one (a copied file has no server
// and the dev shell has no public/ directory). public/ is copied to the dist root.
const hostedHtml = shell.replace(
  scriptTag,
  `<link rel="icon" href="./icon.webp" type="image/webp" sizes="256x256" />\n    ` +
    `<link rel="icon" href="./icon-192.png" type="image/png" sizes="192x192" />\n    ` +
    `<link rel="apple-touch-icon" href="./icon-192.png" />\n    ` +
    `<link rel="manifest" href="./manifest.webmanifest" />\n    ` +
    `<meta name="pq-pwa" content="1" />\n    ` +
    `<link rel="stylesheet" href="./app.css" />\n    ` +
    `<script type="module" src="./app.js"></script>`,
);
// The front page is a page like any other: it declares its own canonical URL, its social
// card and its structured data, so a search engine and a chat preview both read what a
// visitor gets. Without this the app root was the one URL with no head of its own.
const publicPages: string[] = [];
writeFileSync(
  join(dist, 'index.html'),
  shellPage(hostedHtml, {
    title: 'Game Buddy — offline tools for game night',
    description: HOME_DESCRIPTION,
    path: '',
    up: './',
    marker: 'data-home="1"',
    front: true,
  }),
);
publicPages.push(`${SITE_ORIGIN}/`);

// The catalogue as a public contract: pandaqi.com checks its template links against this
// file, so a renamed template is caught where the link lives instead of in a visitor's 404.
const catalogue = await templateCatalogue();
writeFileSync(join(dist, 'templates.json'), templateManifest(catalogue));

if (mode === 'site') {
  const pages = await toolPages();
  for (const page of pages) {
    mkdirSync(join(dist, page.id), { recursive: true });
    writeFileSync(
      join(dist, page.id, 'index.html'),
      shellPage(hostedHtml, {
        title: page.title,
        description: page.blurb,
        path: `${page.id}/`,
        up: '../',
        marker: `data-tool="${page.id}"`,
      }),
    );
    publicPages.push(`${SITE_ORIGIN}/${page.id}/`);
  }
  console.log(`[build] ${pages.length} tool pages: dist/<tool>/index.html`);

  const templates = templatePages(catalogue);
  for (const template of templates) {
    mkdirSync(join(dist, 'template', template.id), { recursive: true });
    writeFileSync(
      join(dist, 'template', template.id, 'index.html'),
      shellPage(hostedHtml, {
        title: template.name,
        description: template.description,
        path: `template/${template.id}/`,
        up: '../../',
        marker: `data-template="${template.id}"`,
      }),
    );
    publicPages.push(`${SITE_ORIGIN}/template/${template.id}/`);
  }
  console.log(`[build] ${templates.length} template pages: dist/template/<id>/index.html`);
}

// A sitemap is how the pages above get found: the app is one URL to a crawler, so the page
// per tool and per template is the only thing a search for a game can land on. In a plain
// build the list is the front page alone, because the other pages do not exist then. No
// robots.txt is written: crawlers only read the one at the domain root, and the site's
// sitemap is announced there (docs/RELEASING.md).
writeFileSync(join(dist, 'sitemap.xml'), sitemapXml(publicPages));
console.log(`[build] sitemap.xml (${publicPages.length} urls)`);

const single = await bundle(scratch, false);
const singleJs = entryOf(single);
const singleCss = inlineCssAssets(cssOf(single), [scratch, styleSourceDir]);
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
  langs: buildLangs,
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
console.log(`[build] ${toolCount} tools · ${buildLangs.join('+')} · mode ${mode} · dist ready`);
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

interface TemplateMeta {
  id: string;
  name: string;
  description: string;
}

/**
 * What this build carries, read from the generated catalogue: one import for both the pages
 * and `dist/templates.json`. `bun run gen` already fails on a duplicate id.
 */
async function templateCatalogue(): Promise<TemplateSummary[]> {
  const module = (await import(pathToFileURL(join(root, 'src', 'data', 'templates.generated.ts')).href)) as {
    bundledTemplates: TemplateSummary[];
    communityTemplates: TemplateSummary[];
  };
  return [...module.bundledTemplates, ...module.communityTemplates].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * One page per bundled and community template, so `/game-buddy/template/catan/` is a real
 * URL a website can link to.
 */
function templatePages(catalogue: TemplateSummary[]): TemplateMeta[] {
  return catalogue.map((template) => {
    const facts = [template.players ? `${template.players} players` : '', template.time ?? ''].filter(Boolean);
    return {
      id: template.id,
      name: template.name,
      description: `${template.name}: a ready-to-play Game Buddy template${facts.length ? ` for ${facts.join(', ')}` : ''}.`,
    };
  });
}

/** The same catalogue in the shape another site can check its links against. */
function templateManifest(catalogue: TemplateSummary[]): string {
  const templates = catalogue.map((template) => ({
    id: template.id,
    name: template.name,
    players: template.players,
    time: template.time,
    url: `/game-buddy/template/${template.id}/`,
  }));
  return `${JSON.stringify({ format: 1, templates }, null, 2)}\n`;
}

/**
 * One page from the shell: title, description, asset paths and the attribute that tells
 * `App` what to boot. `up` is the way back to the app root, written once as `data-root` so
 * copied links and asset paths can never disagree, and `path` is this page relative to it;
 * `marker` is the whole attribute, so a page that ends up without either fails the build
 * instead of shipping.
 */
function shellPage(
  html: string,
  page: {
    title: string;
    description: string;
    path: string;
    up: string;
    marker: string;
    /** The front page: its title already names the app, and it carries the structured data. */
    front?: boolean;
  },
): string {
  const url = `${SITE_ORIGIN}/${page.path}`;
  const head = pageHead(page.title, page.description, url, page.front === true);
  const pageTitle = escapeHtml(page.front ? page.title : `${page.title} — Game Buddy`);
  const built = html
    .replace(/<title>[^<]*<\/title>/, `<title>${pageTitle}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, head)
    .replace('href="./app.css"', `href="${page.up}app.css"`)
    .replace('src="./app.js"', `src="${page.up}app.js"`)
    .replace('href="./manifest.webmanifest"', `href="${page.up}manifest.webmanifest"`)
    .replace('href="./icon.webp"', `href="${page.up}icon.webp"`)
    .replaceAll('href="./icon-192.png"', `href="${page.up}icon-192.png"`)
    .replace('<body>', `<body ${page.marker} data-root="${page.up}">`);
  // A generated page must be able to find its own way back: its bundle, the boot marker,
  // the root that asset paths and copied links resolve against, and its canonical URL.
  // A shell change that drops one of them fails here instead of in a visitor's copied link.
  const required = [
    `src="${page.up}app.js"`,
    page.marker,
    `data-root="${page.up}"`,
    `href="${url}"`,
    `href="${page.up}icon.webp"`,
  ];
  const missing = required.filter((needle) => !built.includes(needle));
  if (missing.length) {
    console.error(`[build] page ${page.marker} is missing ${missing.join(', ')}`);
    process.exit(1);
  }
  return built;
}

/**
 * The head every hosted page shares: the description, the canonical URL and the card a
 * chat app shows. Only these earn their keep — a tool or template page is found through
 * its own title, description and canonical URL, so nothing else is written there.
 */
function pageHead(title: string, description: string, url: string, front: boolean): string {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeUrl = escapeHtml(url);
  const image = escapeHtml(OG_IMAGE);
  const alt = 'Game Buddy: timers, dice and scorepads for game night.';
  // One JSON-LD block, on the front page only, because that is the thing it describes.
  // A skeleton `WebPage` on the other 106 pages would repeat their title, description and
  // URL and tell a crawler nothing it did not already have.
  const structured = front
    ? `\n    <script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Game Buddy',
        url: `${SITE_ORIGIN}/`,
        description: HOME_DESCRIPTION,
        applicationCategory: 'GameApplication',
        operatingSystem: 'Any',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        softwareVersion: version,
        inLanguage: buildLangs,
        license: 'https://github.com/Pandaqi/pq-game-buddy/blob/main/LICENSE',
      }).replace(/</g, '\\u003c')}</script>`
    : '';
  return (
    `<meta name="description" content="${safeDescription}" />\n    ` +
    `<link rel="canonical" href="${safeUrl}" />\n    ` +
    `<meta property="og:type" content="website" />\n    ` +
    `<meta property="og:site_name" content="Game Buddy" />\n    ` +
    `<meta property="og:title" content="${safeTitle}" />\n    ` +
    `<meta property="og:description" content="${safeDescription}" />\n    ` +
    `<meta property="og:url" content="${safeUrl}" />\n    ` +
    `<meta property="og:image" content="${image}" />\n    ` +
    `<meta property="og:image:alt" content="${escapeHtml(alt)}" />\n    ` +
    // X reads `og:*` for everything but the card type, so the rest was the same tag twice.
    `<meta name="twitter:card" content="summary_large_image" />` +
    structured
  );
}

/**
 * Every public page, in the order a crawler should walk them. No `<priority>`: Google
 * ignores it, and a made-up ranking is worse than none.
 */
function sitemapXml(urls: string[]): string {
  const entries = urls.map((url) => `  <url>\n    <loc>${escapeHtml(url)}</loc>\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
