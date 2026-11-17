import type { ToolMeta } from '../../core/registry';
import { ICON } from './icon';

const meta: ToolMeta = {
  id: 'bracket',
  title: 'Bracket',
  blurb: 'Run the tournament: single or double elimination, groups or Swiss.',
  family: 'flow',
  seats: 'multi',
  icon: ICON,
  tags: ['flow', 'tournament'],
};

export default meta;
