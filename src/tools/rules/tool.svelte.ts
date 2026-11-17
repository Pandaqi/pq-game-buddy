import { registerToolStrings, t as translate } from '../../core/i18n.svelte';
import type { ToolContext } from '../../core/registry';
import type { PresetValues } from '../../core/template/schema';
import {
  glossaryFrom,
  setupProgress,
  scoringFrom,
  type GlossaryEntry,
  type RulesInstance,
  type RulesState,
  type ScoringRow,
} from './logic';
import Rules from './Rules.svelte';
import meta from './meta';
import preset from './preset';
import en from './locales/en';

// A tool's words travel with its chunk; the shell only knows its title.
registerToolStrings('rules', en);

function create(ctx: ToolContext, values: PresetValues = {}): RulesInstance {
  const setup = (Array.isArray(values.setup) ? (values.setup as string[]) : [])
    .map((item) => String(item).trim())
    .filter(Boolean)
    .map((text) => ({ text, done: false }));

  const data = $state<RulesState>({
    quick: String(values.quick ?? '').trim(),
    rules: String(values.rules ?? '').trim(),
    setup,
    glossary: glossaryFrom((values.glossary as Record<string, string | number>) ?? {}),
    scoring: scoringFrom((values.scoring as Record<string, string | number>) ?? {}),
    source: String(values.source ?? '').trim(),
  });

  const instance: RulesInstance = {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as RulesState,
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<RulesState>;
      if (typeof raw.quick === 'string') data.quick = raw.quick;
      if (typeof raw.rules === 'string') data.rules = raw.rules;
      if (typeof raw.source === 'string') data.source = raw.source;
      if (Array.isArray(raw.setup)) {
        data.setup = raw.setup
          .filter((item) => item && typeof item.text === 'string')
          .map((item) => ({ text: item.text, done: !!item.done }));
      }
      if (Array.isArray(raw.glossary)) {
        data.glossary = raw.glossary
          .filter((entry) => entry && typeof entry.term === 'string')
          .map((entry) => ({
            term: entry.term,
            definition: typeof entry.definition === 'string' ? entry.definition : '',
          }));
      }
      if (Array.isArray(raw.scoring)) {
        data.scoring = raw.scoring
          .filter((row) => row && typeof row.name === 'string')
          .map((row) => ({ name: row.name, points: Number(row.points) || 0 }));
      }
    },
    presetFromState() {
      const glossary: Record<string, string> = {};
      for (const entry of data.glossary) glossary[entry.term] = entry.definition;
      const scoring: Record<string, number> = {};
      for (const row of data.scoring) scoring[row.name] = row.points;
      return {
        quick: data.quick,
        rules: data.rules,
        setup: data.setup.map((item) => item.text),
        glossary,
        scoring,
        source: data.source,
      };
    },
    commands: {
      reset: () => instance.resetSetup(),
    },
    summary() {
      const lines: string[] = [];
      if (data.quick) lines.push(data.quick);
      const progress = setupProgress(data.setup);
      if (progress.total) {
        lines.push(translate('rules.summary-setup', { done: progress.done, total: progress.total }));
      }
      for (const item of data.setup) lines.push(`${item.done ? '[x]' : '[ ]'} ${item.text}`);
      if (data.scoring.length) {
        lines.push(translate('rules.summary-scoring'));
        for (const row of data.scoring) {
          lines.push(translate('rules.summary-row', { name: row.name, points: row.points }));
        }
      }
      if (data.source) lines.push(data.source);
      return lines.length ? lines.join('\n') : translate('rules.summary-none');
    },
    setQuick(text) {
      const clean = text.trim();
      if (clean === data.quick) return;
      ctx.undo.push(translate('rules.undo-quick'));
      data.quick = clean;
    },
    setRules(text) {
      const clean = text.trim();
      if (clean === data.rules) return;
      ctx.undo.push(translate('rules.undo-text'));
      data.rules = clean;
    },
    setSource(text) {
      const clean = text.trim();
      if (clean === data.source) return;
      ctx.undo.push(translate('rules.undo-source'));
      data.source = clean;
    },
    toggleSetup(index) {
      const item = data.setup[index];
      if (!item) return;
      ctx.undo.push(translate(item.done ? 'rules.undo-uncheck' : 'rules.undo-check'));
      item.done = !item.done;
      ctx.haptics.buzz('short');
      if (setupProgress(data.setup).done === data.setup.length) {
        ctx.toast(translate('rules.toast-complete'));
        ctx.audio.play('success');
      }
    },
    resetSetup() {
      if (!data.setup.some((item) => item.done)) return;
      ctx.undo.push(translate('rules.undo-reset'));
      for (const item of data.setup) item.done = false;
    },
    setSetup(items) {
      const clean = items.map((item) => item.trim()).filter(Boolean);
      if (clean.join('\n') === data.setup.map((item) => item.text).join('\n')) return;
      const done = new Map(data.setup.map((item) => [item.text, item.done]));
      ctx.undo.push(translate('rules.undo-setup'));
      data.setup = clean.map((text) => ({ text, done: done.get(text) ?? false }));
    },
    setGlossary(entries: GlossaryEntry[]) {
      const clean = entries
        .map((entry) => ({ term: entry.term.trim(), definition: entry.definition.trim() }))
        .filter((entry) => entry.term);
      ctx.undo.push(translate('rules.undo-glossary'));
      data.glossary = clean;
    },
    setScoring(rows: ScoringRow[]) {
      const clean = rows
        .map((row) => ({ name: row.name.trim(), points: Number(row.points) || 0 }))
        .filter((row) => row.name);
      ctx.undo.push(translate('rules.undo-scoring'));
      data.scoring = clean;
    },
  };

  return instance;
}

export default { ...meta, preset, component: Rules, create };
