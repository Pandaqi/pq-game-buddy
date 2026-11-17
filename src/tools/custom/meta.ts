import type { ToolMeta } from '../../core/registry';
import { mark } from '../../core/ui/icons';

const meta: ToolMeta = {
  id: 'custom',
  title: 'Custom',
  blurb: 'Build your own tracker: fields, counters, a checklist, a table and formulas.',
  family: 'track',
  icon: mark('sheet'),
  tags: ['track', 'tracker'],
};

export default meta;
