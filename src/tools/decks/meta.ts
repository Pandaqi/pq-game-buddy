import type { ToolMeta } from '../../core/registry';
import { ICON } from './icon';

const meta: ToolMeta = {
  id: 'decks',
  title: 'Decks',
  blurb: 'Shuffle, cut, deal and hide cards, from poker night to Uno.',
  family: 'randomize',
  seats: 'multi',
  icon: ICON,
  tags: ['random', 'cards'],
};

export default meta;
