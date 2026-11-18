/** One row of the template gallery: everything the lists show, without the text. */

import { parseTemplate } from '../core/template/parse';

export interface TemplateSummary {
  id: string;
  name: string;
  players?: string;
  time?: string;
  tags: string[];
  tools: string[];
  /** A mark name the gallery draws; the renderer ignores an unknown one. */
  icon?: string;
}

/**
 * Computed at generation time so the shell never parses 61 templates to draw a
 * list. `[rules]` and `[setup]` mount a rules tool, so the gallery says so.
 */
export function summariseTemplate(id: string, text: string): TemplateSummary {
  const parsed = parseTemplate(text).template;
  const range = parsed.game.players;
  // Two instances of one tool (roles and a vote pad) are still one chip.
  const tools = [...new Set(parsed.tools.map((tool) => tool.toolId))];
  if (!tools.includes('rules') && (parsed.rules.trim() || parsed.setup.length)) tools.push('rules');
  const icon = parsed.game.icon || undefined;
  return {
    id,
    name: parsed.game.name || id,
    players: range ? (range.min === range.max ? String(range.min) : `${range.min}-${range.max}`) : undefined,
    time: parsed.game.time,
    tags: parsed.game.tags,
    tools,
    icon,
  };
}
