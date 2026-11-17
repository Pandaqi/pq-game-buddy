import type { ToolMeta } from '../../core/registry';
import { ICON } from './icon';

const meta: ToolMeta = {
  id: 'coin',
  title: 'Coin',
  blurb: 'Call it in the air. One coin or ten, fair or weighted.',
  family: 'randomize',
  seats: 'none',
  icon: ICON,
  tags: ['random', 'party'],
};

export default meta;
