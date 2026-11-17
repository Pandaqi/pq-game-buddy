import type { PresetSchema } from '../../core/template/schema';

const preset: PresetSchema = {
  order: { type: 'list', default: [], label: 'Draft order (empty means the session players)' },
  snake: { type: 'boolean', default: false, label: 'Snake order' },
  pool: { type: 'list', default: [], label: 'Pool of things to draft' },
  seconds: { type: 'duration', default: '60s', label: 'Seconds per pick' },
  auction: { type: 'boolean', default: false, label: 'Auction instead of a draft' },
  budget: { type: 'number', default: 100, min: 1, max: 10000, label: 'Budget per player (auction)' },
};

export default preset;
