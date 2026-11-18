import type { PresetSchema } from '../../core/template/schema';

const preset: PresetSchema = {
  deck: {
    type: 'enum',
    values: ['standard', 'euchre', 'skat', 'rummy', 'uno', 'tarot', 'domino', 'custom'],
    default: 'standard',
    label: 'Deck',
  },
  decks: { type: 'number', default: 1, min: 1, max: 6, label: 'How many decks' },
  jokers: { type: 'number', default: 0, min: 0, max: 4, label: 'Jokers' },
  players: { type: 'number', default: 2, min: 1, max: 12, label: 'Seats when no players are set' },
  deal: { type: 'number', default: 5, min: 0, max: 30, label: 'Cards per deal' },
  hidden: { type: 'boolean', default: false, label: 'Hide hands until revealed' },
  cards: { type: 'list', default: [], label: 'Custom cards (one per entry)' },
};

export default preset;
