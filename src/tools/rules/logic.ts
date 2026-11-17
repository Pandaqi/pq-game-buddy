import type { ToolInstance } from '../../core/registry';

export interface SetupItem {
  text: string;
  done: boolean;
}

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export interface ScoringRow {
  name: string;
  points: number;
}

export interface RulesState {
  quick: string;
  rules: string;
  setup: SetupItem[];
  glossary: GlossaryEntry[];
  scoring: ScoringRow[];
  source: string;
}

export interface RulesActions {
  setQuick(text: string): void;
  setRules(text: string): void;
  setSource(text: string): void;
  toggleSetup(index: number): void;
  resetSetup(): void;
  setSetup(items: string[]): void;
  setGlossary(entries: GlossaryEntry[]): void;
  setScoring(rows: ScoringRow[]): void;
}

export type RulesInstance = ToolInstance<RulesState> & RulesActions;

export interface RuleBlock {
  kind: 'heading' | 'paragraph' | 'item';
  level: number;
  text: string;
}

/** Plain-markdown: headings, paragraphs and `-` lists. No HTML, no links. */
export function parseRules(text: string): RuleBlock[] {
  const blocks: RuleBlock[] = [];
  let paragraph: string[] = [];

  const flush = (): void => {
    const joined = paragraph.join(' ').trim();
    if (joined) blocks.push({ kind: 'paragraph', level: 0, text: joined });
    paragraph = [];
  };

  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flush();
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2].trim() });
      continue;
    }
    const item = line.match(/^[-*]\s+(.+)$/);
    if (item) {
      flush();
      blocks.push({ kind: 'item', level: 0, text: item[1].trim() });
      continue;
    }
    paragraph.push(line);
  }
  flush();
  return blocks;
}

/** Strip the few inline markers we render as plain text. */
export function plainText(text: string): string {
  return String(text ?? '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

export function setupProgress(setup: SetupItem[]): { done: number; total: number } {
  return { done: setup.filter((item) => item.done).length, total: setup.length };
}

export function glossaryMatches(glossary: GlossaryEntry[], query: string): GlossaryEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return glossary;
  return glossary.filter(
    (entry) =>
      entry.term.toLowerCase().includes(needle) || entry.definition.toLowerCase().includes(needle),
  );
}

export function rulesMatches(rules: string, query: string): RuleBlock[] {
  const blocks = parseRules(rules);
  const needle = query.trim().toLowerCase();
  if (!needle) return blocks;
  return blocks.filter((block) => block.text.toLowerCase().includes(needle));
}

export function glossaryFrom(pairs: Record<string, string | number>): GlossaryEntry[] {
  return Object.entries(pairs).map(([term, definition]) => ({
    term: term.trim(),
    definition: String(definition).trim(),
  }));
}

export function scoringFrom(pairs: Record<string, string | number>): ScoringRow[] {
  return Object.entries(pairs).map(([name, points]) => ({
    name: name.trim(),
    points: Number(points) || 0,
  }));
}
