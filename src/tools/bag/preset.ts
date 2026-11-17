import type { PresetSchema } from '../../core/template/schema';

const preset: PresetSchema = {
  set: { type: 'enum', values: ['scrabble', 'bananagrams', 'generic', 'custom'], default: 'scrabble', label: 'Tile set' },
  counts: { type: 'pairs', default: {}, label: 'Custom counts (type=count)' },
  values: { type: 'pairs', default: {}, label: 'Points per type (type=points)' },
  draw: { type: 'number', default: 7, min: 1, max: 50, label: 'Tokens per draw' },
  tray: { type: 'enum', values: ['shared', 'per-player'], default: 'shared', label: 'Tray' },
};

export default preset;
