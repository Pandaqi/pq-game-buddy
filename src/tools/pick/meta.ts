import type { ToolMeta } from '../../core/registry';
import { ICON } from './icon';

const meta: ToolMeta = {
  id: 'pick',
  title: 'Pick',
  blurb: 'Settle it: numbers, lists, teams, seats or who goes first.',
  family: 'randomize',
  seats: 'multi',
  icon: ICON,
  tags: ['random', 'party'],
};

export default meta;
