import type { PresetSchema } from '../../core/template/schema';

const preset: PresetSchema = {
  coins: { type: 'number', default: 1, min: 1, max: 10 },
  fairness: { type: 'number', default: 50, min: 0, max: 100 },
  mode: { type: 'enum', values: ['single', 'best'], default: 'single' },
  target: { type: 'number', default: 3, min: 1, max: 20 },
};

export default preset;
