import type { ToolMeta } from '../../core/registry';
import { ICON } from './icon';

const meta: ToolMeta = {
  id: 'reveal',
  title: 'Reveal',
  blurb: 'Hand out secret roles without anyone seeing the wrong card.',
  family: 'reveal',
  seats: 'multi',
  icon: ICON,
  tags: ['reveal', 'secrets'],
};

export default meta;
