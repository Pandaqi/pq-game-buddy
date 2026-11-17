import type { ToolMeta } from '../../core/registry';
import { ICON } from './icon';

const meta: ToolMeta = {
  id: 'score',
  title: 'Score',
  blurb: 'Write down the points. Totals, rounds or categories, with formulas if you need them.',
  family: 'track',
  seats: 'multi',
  icon: ICON,
  tags: ['track', 'board', 'card'],
};

export default meta;
