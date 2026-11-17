import type { ToolMeta } from '../../core/registry';
import { mark } from '../../core/ui/icons';

const meta: ToolMeta = {
  id: 'splits',
  title: 'Splits',
  blurb: 'Speedrun split timer with a personal best, deltas and gold splits.',
  family: 'time',
  seats: 'none',
  icon: mark('stopwatch'),
  tags: ['time', 'speedrun'],
};

export default meta;
