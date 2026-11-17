import type { PresetSchema } from '../../core/template/schema';

const preset: PresetSchema = {
  fields: { type: 'pairs', default: {}, label: 'Fields (label=type: text, number, checkbox, note)' },
  counters: { type: 'pairs', default: {}, label: 'Counters (name=start)' },
  checklist: { type: 'list', default: [], label: 'Checklist items' },
  table: { type: 'string', default: '3x3', label: 'Table size (rows x columns)' },
  formula: { type: 'string', default: '', label: 'Formula (uses counter names as variables)' },
  'per-player': { type: 'boolean', default: false, label: 'A sheet per player' },
};

export default preset;
