import type { PresetSchema } from '../../core/template/schema';

const preset: PresetSchema = {
  format: {
    type: 'enum',
    values: ['single', 'double', 'round-robin', 'groups', 'swiss'],
    default: 'single',
    label: 'Format',
  },
  entrants: { type: 'list', default: [], label: 'Entrants (empty means the session players)' },
  'best-of': { type: 'number', default: 1, min: 1, max: 9, label: 'Best of' },
  seeding: { type: 'enum', values: ['order', 'random'], default: 'order', label: 'Seeding' },
  tiebreak: { type: 'enum', values: ['diff', 'head'], default: 'diff', label: 'Tiebreaker' },
};

export default preset;
