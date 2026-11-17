import type { ToolMeta } from '../../core/registry';
import { ICON } from './icon';

const meta: ToolMeta = {
  id: 'lives',
  title: 'Lives',
  blurb: 'Three hearts, two extra tracks, one last chance.',
  family: 'track',
  seats: 'multi',
  icon: ICON,
  tags: ['tracking', 'health'],
};

export default meta;
