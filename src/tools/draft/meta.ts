import type { ToolMeta } from '../../core/registry';
import { ICON } from './icon';

const meta: ToolMeta = {
  id: 'draft',
  title: 'Draft',
  blurb: 'Snake or linear pick order, a pick clock, and auctions.',
  family: 'flow',
  seats: 'multi',
  icon: ICON,
  tags: ['flow', 'draft', 'auction'],
};

export default meta;
