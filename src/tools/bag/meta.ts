import type { ToolMeta } from '../../core/registry';
import { ICON } from './icon';

const meta: ToolMeta = {
  id: 'bag',
  title: 'Bag',
  blurb: 'Pull a tile blind, with values and a tray.',
  family: 'randomize',
  seats: 'one',
  icon: ICON,
  tags: ['random', 'words', 'tokens'],
};

export default meta;
