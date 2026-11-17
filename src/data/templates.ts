import { parseTemplate } from '../core/template/parse';
import { bundledTemplates } from './templates.generated';

export interface TemplateSummary {
  id: string;
  name: string;
  players?: string;
  time?: string;
  tags: string[];
  tools: string[];
  text: string;
}

let cache: TemplateSummary[] | null = null;

/** Parse bundled templates once, lazily. */
export function listTemplates(): TemplateSummary[] {
  if (cache) return cache;
  cache = bundledTemplates.map((item) => {
    const parsed = parseTemplate(item.text).template;
    const range = parsed.game.players;
    const tools = parsed.tools.map((tool) => tool.toolId);
    // [rules] and [setup] mount a rules tool, so the gallery should say so.
    if (!tools.includes('rules') && (parsed.rules.trim() || parsed.setup.length)) tools.push('rules');
    return {
      id: item.id,
      name: parsed.game.name || item.id,
      players: range ? (range.min === range.max ? String(range.min) : `${range.min}-${range.max}`) : undefined,
      time: parsed.game.time,
      tags: parsed.game.tags,
      tools,
      text: item.text,
    };
  });
  return cache;
}

export function findTemplate(id: string): TemplateSummary | undefined {
  return listTemplates().find((item) => item.id === id);
}
