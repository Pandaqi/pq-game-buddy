import type { ToolMeta } from '../../core/registry';
import { mark } from '../../core/ui/icons';

const meta: ToolMeta = {
  id: 'counters',
  title: 'Counters',
  blurb: 'Named counters and a shared bank, with transfers, denominations and a log.',
  family: 'track',
  seats: 'none',
  icon: mark('token'),
  tags: ['tracking', 'economy'],
};

export default meta;
