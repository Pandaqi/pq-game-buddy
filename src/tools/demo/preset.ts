import type { PresetSchema } from '../../core/template/schema';

const preset: PresetSchema = {
  label: { type: 'string', default: 'Taps' },
  start: { type: 'number', default: 0, min: 0, max: 1000 },
};

export default preset;
