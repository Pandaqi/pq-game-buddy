/** Turn a parsed template into the tool list a session starts with. */

import type { ResolvedTool, Template } from './parse';

/**
 * Templates carry `[rules]` and `[setup]` sections. When they do not also wire
 * the rules tool, mount one so the summary and checklist are actually visible.
 */
export function toolsForSession(template: Template, resolved: ResolvedTool[]): ResolvedTool[] {
  if (resolved.some((tool) => tool.toolId === 'rules')) return resolved;
  if (!template.rules.trim() && !template.setup.length) return resolved;
  return [
    ...resolved,
    {
      toolId: 'rules',
      instanceId: 'rules',
      line: template.game.line,
      values: {
        quick: '',
        rules: template.rules,
        setup: template.setup,
        glossary: {},
        scoring: {},
        source: template.game.source ?? '',
      },
    },
  ];
}
