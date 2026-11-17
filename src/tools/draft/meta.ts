import type { ToolMeta } from '../../core/registry';
import { mark } from '../../core/ui/icons';

const meta: ToolMeta = {
  id: 'draft',
  title: 'Draft',
  blurb: 'Snake or linear pick order, a pick clock, and auctions.',
  family: 'flow',
  icon: mark('flag'),
  tags: ['flow', 'draft', 'auction'],
};

export default meta;
