import type { PresetSchema } from '../../core/template/schema';

const preset: PresetSchema = {
  counters: { type: 'pairs', default: {}, label: 'Counters' },
  bank: { type: 'number', default: 0, min: 0, max: 999999, label: 'Starting bank' },
  denominations: { type: 'list', default: ['1', '5', '10', '25', '100'], label: 'Denominations' },
  step: { type: 'number', default: 1, min: 1, max: 1000, label: 'Step' },
  hidden: { type: 'boolean', default: false, label: 'Hide values' },
};

export default preset;
