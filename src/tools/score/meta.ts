import type { ToolMeta } from '../../core/registry';
import { mark } from '../../core/ui/icons';

const meta: ToolMeta = {
  id: 'score',
  title: 'Score',
  blurb: 'Totals, rounds or categories, with formulas, hidden scores and a leaderboard.',
  family: 'track',
  seats: 'multi',
  icon: mark('sheet'),
  tags: ['track', 'board', 'card'],
};

export default meta;
