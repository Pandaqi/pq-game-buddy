import type { PresetSchema } from '../../core/template/schema';

const preset: PresetSchema = {
  roll: { type: 'string', default: '1d6' },
  pool: { type: 'string', default: '' },
  advantage: { type: 'enum', values: ['none', 'advantage', 'disadvantage'], default: 'none' },
  'success-at': { type: 'number', default: 0, min: 0, max: 100 },
  seed: { type: 'string', default: '' },
  macros: { type: 'pairs', default: {} },
};

export default preset;
