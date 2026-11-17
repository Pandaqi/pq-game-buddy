import type { PresetSchema } from '../../core/template/schema';

const preset: PresetSchema = {
  lives: { type: 'number', default: 3, min: 0, max: 999, label: 'Starting lives' },
  max: { type: 'number', default: 10, min: 1, max: 999, label: 'Maximum lives' },
  step: { type: 'number', default: 1, min: 1, max: 100, label: 'Life step' },
  mode: { type: 'enum', values: ['shared', 'players'], default: 'shared', label: 'Who has lives' },
  elimination: { type: 'boolean', default: true, label: 'Eliminate at zero' },
  extras: { type: 'pairs', default: {}, label: 'Extra tracks' },
  conditions: { type: 'list', default: [], label: 'Conditions' },
  hidden: { type: 'boolean', default: false, label: 'Hide totals' },
};

export default preset;
