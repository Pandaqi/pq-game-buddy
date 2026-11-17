import type { ToolMeta } from '../../core/registry';
import { ICON } from './icon';

const meta: ToolMeta = {
  id: 'demo',
  title: 'Demo',
  blurb: 'A tiny counter that proves tool folders are picked up automatically.',
  family: 'track',
  seats: 'none',
  icon: ICON,
  tags: ['dev'],
};

export default meta;
