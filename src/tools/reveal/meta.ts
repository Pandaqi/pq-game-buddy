import type { ToolMeta } from '../../core/registry';
import { mark } from '../../core/ui/icons';

const meta: ToolMeta = {
  id: 'reveal',
  title: 'Reveal',
  blurb: 'Deal secret roles, run a ballot or take blind bids without leaking.',
  family: 'reveal',
  icon: mark('eye'),
  tags: ['reveal', 'secrets'],
};

export default meta;
