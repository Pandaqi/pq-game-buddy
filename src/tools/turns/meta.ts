import type { ToolMeta } from '../../core/registry';
import { mark } from '../../core/ui/icons';

const meta: ToolMeta = {
  id: 'turns',
  title: 'Turns',
  blurb: 'Whose turn it is, the round, the phase and an optional turn clock.',
  family: 'flow',
  icon: mark('flag'),
  tags: ['flow', 'tracking'],
};

export default meta;
