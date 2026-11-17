import type { ToolMeta } from '../../core/registry';
import { ICON } from './icon';

const meta: ToolMeta = {
  id: 'splits',
  title: 'Splits',
  blurb: 'Race the clock, then compare splits: your best run and gold splits.',
  family: 'time',
  seats: 'none',
  icon: ICON,
  tags: ['time', 'speedrun'],
};

export default meta;
