import type { PresetSchema } from '../../core/template/schema';

const preset: PresetSchema = {
  profile: {
    type: 'enum',
    values: ['en', 'nl', 'de', 'fr', 'es', 'pt', 'it', 'id', 'tr', 'vi', 'pl', 'ja', 'zh', 'ko'],
    default: 'en',
    label: 'Word pack',
  },
  mode: {
    type: 'enum',
    values: ['check', 'filters', 'anagram', 'rack', 'letters', 'codenames'],
    default: 'check',
    label: 'Mode',
  },
  letters: { type: 'string', default: '', label: 'Letters' },
  pattern: { type: 'string', default: '', label: 'Letter pattern (use _ for a gap)' },
  length: { type: 'number', default: 0, min: 0, max: 30, label: 'Exact length (0 = any)' },
  count: { type: 'number', default: 7, min: 1, max: 20, label: 'Letters to pick' },
  blanks: { type: 'number', default: 0, min: 0, max: 4, label: 'Blanks in the rack' },
  seed: { type: 'string', default: '', label: 'Seed (repeatable draws)' },
  words: { type: 'list', default: [], label: 'Extra words for this game' },
};

export default preset;
