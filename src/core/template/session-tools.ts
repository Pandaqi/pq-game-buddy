/** Route a template's [script] blocks into a script tool, and mount rules when needed. */

import type { ResolvedTool, Template, TemplateVariant } from './parse';

/** `[script night]` steps become the `steps` list of the script instance "night". */
export function toolsForSession(template: Template, resolved: ResolvedTool[]): ResolvedTool[] {
  const tools = resolved.map((tool) => ({ ...tool, values: { ...tool.values } }));

  for (const block of template.scripts) {
    const steps = block.steps.map((step) => `${step.verb}: ${step.arg}`);
    if (!steps.length) continue;
    const existing = tools.find((tool) => tool.toolId === 'script' && tool.instanceId === block.instanceId);
    if (existing) {
      const current = Array.isArray(existing.values.steps) ? (existing.values.steps as string[]) : [];
      if (!current.length) existing.values.steps = steps;
      continue;
    }
    tools.push({
      toolId: 'script',
      instanceId: block.instanceId,
      line: block.line,
      values: { steps, events: [], 'event-deck': false, 'auto-advance': false },
    });
  }

  if (tools.some((tool) => tool.toolId === 'rules')) return tools;
  if (!template.rules.trim() && !template.setup.length) return tools;
  return [
    ...tools,
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

/**
 * Fold a chosen house-rule variant into the rules sheet. The variant is plain
 * text, so it never rewrites a tool's settings and stays safe in format 1.
 */
export function applyVariant(tools: ResolvedTool[], variant: TemplateVariant): ResolvedTool[] {
  const text = [variant.name, variant.text].map((part) => part.trim()).filter(Boolean).join('\n\n');
  if (!text) return tools;
  const next = tools.map((tool) => ({ ...tool, values: { ...tool.values } }));
  const rules = next.find((tool) => tool.toolId === 'rules');
  if (rules) {
    const current = String(rules.values.rules ?? '').trim();
    rules.values.rules = current ? `${current}\n\n${text}` : text;
    return next;
  }
  return [
    ...next,
    {
      toolId: 'rules',
      instanceId: 'rules',
      line: variant.line,
      values: {
        quick: '',
        rules: text,
        setup: [],
        glossary: {},
        scoring: {},
        source: '',
      },
    },
  ];
}
