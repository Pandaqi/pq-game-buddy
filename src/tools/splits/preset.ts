import type { PresetSchema } from '../../core/template/schema';

const preset: PresetSchema = {
  game: { type: 'string', default: 'My game', label: 'Game' },
  category: { type: 'string', default: '', label: 'Category' },
  splits: { type: 'list', default: [], label: 'Splits (name, or name | target seconds)' },
  pb: { type: 'list', default: [], label: 'Personal best segment times (seconds)' },
  keys: { type: 'boolean', default: true, label: 'Space to split, R to reset' },
};

export default preset;
