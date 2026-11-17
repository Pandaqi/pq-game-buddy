import type { ToolMeta } from '../../core/registry';
import { mark } from '../../core/ui/icons';

const meta: ToolMeta = {
  id: 'bracket',
  title: 'Bracket',
  blurb: 'Tournaments: single or double elimination, round robin, groups and Swiss.',
  family: 'flow',
  icon: mark('bracket'),
  tags: ['flow', 'tournament'],
};

export default meta;
