import type { ToolContext } from '../../core/registry';
import type { PresetValues } from '../../core/template/schema';
import Demo from './Demo.svelte';
import meta from './meta';
import preset from './preset';

export interface DemoState {
  label: string;
  count: number;
}

function create(ctx: ToolContext, values: PresetValues = {}) {
  const data = $state<DemoState>({
    label: String(values.label ?? 'Taps'),
    count: Number(values.start ?? 0),
  });

  return {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as DemoState,
    load(state: unknown) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<DemoState>;
      if (typeof raw.label === 'string') data.label = raw.label;
      if (typeof raw.count === 'number') data.count = raw.count;
    },
    presetFromState() {
      return { label: data.label, start: data.count };
    },
    commands: {
      tap: () => {
        data.count += 1;
      },
    },
    summary: () => `${data.label}: ${data.count}`,
  };
}

export default { ...meta, preset, component: Demo, create };
