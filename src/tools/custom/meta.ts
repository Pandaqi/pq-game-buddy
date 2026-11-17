import type { ToolMeta } from '../../core/registry';
import { ICON } from './icon';

const meta: ToolMeta = {
  id: 'custom',
  title: 'Custom',
  blurb: 'Build the tracker no tool covers: fields, counters, a checklist, a table.',
  family: 'track',
  seats: 'multi',
  icon: ICON,
  tags: ['track', 'tracker'],
};

export default meta;
