import type { ToolMeta } from '../../core/registry';
import { ICON } from './icon';

const meta: ToolMeta = {
  id: 'counters',
  title: 'Counters',
  blurb: 'Keep money, tokens or points straight, with a shared bank.',
  family: 'track',
  seats: 'none',
  icon: ICON,
  tags: ['tracking', 'economy'],
};

export default meta;
