import type { ToolMeta } from '../../core/registry';
import { ICON } from './icon';

const meta: ToolMeta = {
  id: 'dice',
  title: 'Dice',
  blurb: 'Roll any die or notation, with keep, reroll and exploding dice.',
  family: 'randomize',
  seats: 'none',
  icon: ICON,
  tags: ['random', 'dice'],
};

export default meta;
