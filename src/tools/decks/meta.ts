import type { ToolMeta } from '../../core/registry';
import { mark } from '../../core/ui/icons';

const meta: ToolMeta = {
  id: 'decks',
  title: 'Decks',
  blurb: 'Shuffle, cut, deal and hide cards, from poker to Uno.',
  family: 'randomize',
  icon: mark('card'),
  tags: ['random', 'cards'],
};

export default meta;
