import type { ToolMeta } from '../../core/registry';
import { mark } from '../../core/ui/icons';

const meta: ToolMeta = {
  id: 'timer',
  title: 'Timer',
  blurb: 'Countdowns, stopwatch, flip timers and chess clocks.',
  family: 'time',
  seats: 'one',
  icon: mark('clock'),
  tags: ['time', 'clock', 'party'],
};

export default meta;
