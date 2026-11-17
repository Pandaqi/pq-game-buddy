import type { PresetSchema } from '../../core/template/schema';

const preset: PresetSchema = {
  steps: { type: 'list', default: [], label: 'Steps ("verb: text" per entry)' },
  events: { type: 'list', default: [], label: 'Event deck cards' },
  'event-deck': { type: 'boolean', default: false, label: 'Draw from an event deck' },
  'auto-advance': { type: 'boolean', default: false, label: 'Continue when a wait ends' },
  voice: { type: 'boolean', default: false, label: 'Read say steps aloud' },
};

export default preset;
