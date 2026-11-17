import type { ToolMeta } from '../../core/registry';
import { mark } from '../../core/ui/icons';

const meta: ToolMeta = {
  id: 'demo',
  title: 'Demo',
  blurb: 'A tiny counter that proves tool folders are picked up automatically.',
  family: 'track',
  seats: 'none',
  icon: mark('sparkle'),
  tags: ['dev'],
};

export default meta;
