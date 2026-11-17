import type { ToolMeta } from '../../core/registry';
import { mark } from '../../core/ui/icons';

const meta: ToolMeta = {
  id: 'lives',
  title: 'Lives',
  blurb: 'Track lives, extra tracks and conditions, with elimination and game over.',
  family: 'track',
  icon: mark('heart'),
  tags: ['tracking', 'health'],
};

export default meta;
