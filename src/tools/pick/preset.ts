import type { PresetSchema } from '../../core/template/schema';

const preset: PresetSchema = {
  source: { type: 'enum', values: ['number', 'list', 'players', 'teams', 'seats'], default: 'number' },
  values: { type: 'list', default: [] },
  count: { type: 'number', default: 1, min: 1, max: 50 },
  replacement: { type: 'boolean', default: true },
  teams: { type: 'number', default: 2, min: 2, max: 12 },
  view: { type: 'enum', values: ['list', 'cards'], default: 'list' },
  seed: { type: 'string', default: '' },
};

export default preset;
