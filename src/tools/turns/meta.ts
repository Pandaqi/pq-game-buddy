import type { ToolMeta } from '../../core/registry';
import { ICON } from './icon';

const meta: ToolMeta = {
  id: 'turns',
  title: 'Turns',
  blurb: 'Whose turn, which round, which phase, with a clock if the table wants one.',
  family: 'flow',
  seats: 'multi',
  icon: ICON,
  tags: ['flow', 'tracking'],
};

export default meta;
