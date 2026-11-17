import type { PresetSchema } from '../../core/template/schema';

const preset: PresetSchema = {
  mode: { type: 'enum', values: ['simple', 'rounds'], default: 'simple' },
  rounds: { type: 'number', default: 0, min: 0, max: 100 },
  categories: { type: 'pairs', default: {} },
  formula: { type: 'string', default: '' },
  win: { type: 'enum', values: ['highest', 'lowest'], default: 'highest' },
  target: { type: 'number', default: 0, min: 0, max: 100000 },
  hidden: { type: 'boolean', default: false },
  start: { type: 'number', default: 0 },
  step: { type: 'number', default: 1, min: 1, max: 1000 },
};

export default preset;
