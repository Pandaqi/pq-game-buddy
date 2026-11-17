import type { PresetSchema } from '../../core/template/schema';

const preset: PresetSchema = {
  packs: { type: 'list', default: ['genres', 'themes', 'mechanics'], label: 'Packs to draw from' },
  draw: { type: 'number', default: 1, min: 1, max: 10, label: 'Cards per draw' },
  designer: { type: 'boolean', default: false, label: 'Designer mode (genre + mechanics + theme)' },
  locks: { type: 'list', default: [], label: 'Locked entries (always kept)' },
  seed: { type: 'string', default: '', label: 'Seed (repeatable draws)' },
};

export default preset;
