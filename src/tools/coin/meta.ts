import type { ToolMeta } from '../../core/registry';
import { mark } from '../../core/ui/icons';

const meta: ToolMeta = {
  id: 'coin',
  title: 'Coin',
  blurb: 'Flip one coin or ten, fair or weighted, with call-it.',
  family: 'randomize',
  seats: 'none',
  icon: mark('chip'),
  tags: ['random', 'party'],
};

export default meta;
