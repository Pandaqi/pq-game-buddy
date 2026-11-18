/**
 * Writes the three bundled CJK faces. This is the one script in the project that uses the
 * network, and only when a human runs `bun run fonts:cjk`; `bun run check` never calls it,
 * and the `.woff2` it writes are committed.
 *
 * Why subset at all: a Noto CJK variable font is 9 MB because it carries every ideograph
 * in the standard, including tens of thousands a game-night interface will never show.
 * Google's per-slice woff2 split does not help here — the slices are cut by codepoint
 * range, so almost every slice holds a handful of common characters plus thousands of
 * rare ones, and keeping only the useful slices still measured 9.8 MB (and 271
 * `@font-face` rules in every first visit). Subsetting to the standard common sets gives
 * one variable file per script, a third of a megabyte to a megabyte, and three rules.
 *
 * A character outside the set is not a hole: the stacks in `fonts.css` name the platform's
 * faces after ours, so a rare kanji or an unusual syllable still renders — just not in
 * the bundled drawing.
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import subsetFont from 'subset-font';

const root = join(import.meta.dir, '..');
const fontDir = join(root, 'src', 'core', 'styles', 'fonts');
const cache = join(root, 'assets_temp', 'cjk');

const NOTO = 'https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/Variable/TTF/Subset';
/** The sources of the common sets; both are lists maintained outside this project. */
const JOYO = 'https://raw.githubusercontent.com/NHV33/joyo-kanji-compilation/master/joyo.csv';
const HANZI =
  'https://raw.githubusercontent.com/shengdoushi/common-standard-chinese-characters-table/master/level-1.txt';

const range = (from: number, to: number): string =>
  Array.from({ length: to - from + 1 }, (_, index) => String.fromCodePoint(from + index)).join('');

/** Punctuation and fullwidth forms the three scripts share with Latin's neighbours. */
const EAST_ASIAN = range(0x3000, 0x303f) + range(0xff01, 0xff60) + range(0xffe0, 0xffe6);

interface Script {
  id: string;
  file: string;
  family: string;
  /** What is in the file, quoted in `fonts.css` and `docs/STYLES.md`; keep it exact. */
  covers: string;
  source: string;
  text: () => Promise<string>;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response.text();
}

async function download(url: string, path: string): Promise<boolean> {
  const response = await fetch(url);
  if (!response.ok) return false;
  writeFileSync(path, new Uint8Array(await response.arrayBuffer()));
  return true;
}

const SCRIPTS: Script[] = [
  {
    id: 'ja',
    file: 'cjk-ja.woff2',
    family: 'Noto Sans JP',
    covers: 'hiragana, katakana and the 2,136 jōyō kanji',
    source: `${NOTO}/NotoSansJP-VF.ttf`,
    text: async () =>
      range(0x3041, 0x3096) +
      range(0x30a1, 0x30fa) +
      range(0x30fc, 0x30ff) +
      EAST_ASIAN +
      (await fetchText(JOYO))
        .split('\n')
        .slice(1)
        .map((line) => line.split(',')[1] ?? '')
        .join(''),
  },
  {
    id: 'zh',
    file: 'cjk-zh.woff2',
    family: 'Noto Sans SC',
    covers: 'the 3,500 characters of 通用规范汉字表 level 1',
    source: `${NOTO}/NotoSansSC-VF.ttf`,
    text: async () => EAST_ASIAN + (await fetchText(HANZI)),
  },
  {
    id: 'ko',
    file: 'cjk-ko.woff2',
    family: 'Noto Sans KR',
    covers: 'all 11,172 hangul syllables plus the compatibility jamo',
    source: `${NOTO}/NotoSansKR-VF.ttf`,
    text: async () => range(0xac00, 0xd7a3) + range(0x3131, 0x318e) + EAST_ASIAN,
  },
];

mkdirSync(cache, { recursive: true });
mkdirSync(fontDir, { recursive: true });

for (const script of SCRIPTS) {
  const source = join(cache, `${script.id}.ttf`);
  const fetched = await download(script.source, source);
  if (!fetched) throw new Error(`${script.source} could not be downloaded`);

  const text = await script.text();
  const buffer = await Bun.file(source).arrayBuffer();
  const started = Date.now();
  const subset = await subsetFont(Buffer.from(buffer), text, { targetFormat: 'woff2' });
  writeFileSync(join(fontDir, script.file), subset);

  const kb = (subset.length / 1024).toFixed(0);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`[cjk] ${script.file}: ${[...text].length} characters, ${kb} KB, ${seconds}s`);
}

rmSync(cache, { recursive: true, force: true });
console.log('[cjk] done; commit src/core/styles/fonts/cjk-*.woff2');
