/** Lints every bundled template and every tool's example.gamebuddy. */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { schemas } from '../src/core/schemas.generated';
import { allDiagnostics, hasErrors, parseTemplate, resolveTemplate } from '../src/core/template/parse';

const root = join(import.meta.dir, '..');

const files: { label: string; path: string }[] = [];
const templatesDir = join(root, 'src/data/templates');
if (existsSync(templatesDir)) {
  for (const file of readdirSync(templatesDir).filter((name) => name.endsWith('.gamebuddy')).sort()) {
    files.push({ label: `templates/${file}`, path: join(templatesDir, file) });
  }
}

const communityDir = join(root, 'src/data/community');
if (existsSync(communityDir)) {
  for (const file of readdirSync(communityDir).filter((name) => name.endsWith('.gamebuddy')).sort()) {
    files.push({ label: `community/${file}`, path: join(communityDir, file) });
  }
}

const toolsDir = join(root, 'src/tools');
for (const dir of readdirSync(toolsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
  const file = join(toolsDir, dir.name, 'example.gamebuddy');
  if (existsSync(file)) files.push({ label: `${dir.name}/example.gamebuddy`, path: file });
}

let errors = 0;
let warnings = 0;

for (const file of files) {
  const text = readFileSync(file.path, 'utf8');
  const parsed = parseTemplate(text);
  const resolved = resolveTemplate(parsed.template, (id) => schemas[id]);
  const diagnostics = allDiagnostics(parsed.diagnostics, resolved.diagnostics);
  const fatal = hasErrors(diagnostics);
  if (fatal) errors += 1;
  if (diagnostics.length) {
    console.log(`${fatal ? 'FAIL' : 'warn'} ${file.label}`);
    for (const item of diagnostics) {
      if (item.severity === 'warning') warnings += 1;
      console.log(`  ${item.severity} line ${item.line}: ${item.message}`);
    }
  } else {
    console.log(`ok   ${file.label}`);
  }
  if (parsed.template.players.length === 0 && !parsed.template.game.players) {
    console.log(`  warn ${file.label}: no players list and no players range`);
    warnings += 1;
  }
}

console.log('');
console.log(`[lint] ${files.length} templates · ${errors} errors · ${warnings} warnings`);
process.exit(errors > 0 ? 1 : 0);
