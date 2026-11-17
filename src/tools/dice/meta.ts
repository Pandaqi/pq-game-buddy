import type { ToolMeta } from '../../core/registry';
import { mark } from '../../core/ui/icons';

const meta: ToolMeta = {
  id: 'dice',
  title: 'Dice',
  blurb: 'Roll any die or notation, with keep, reroll and exploding dice.',
  family: 'randomize',
  seats: 'none',
  icon: mark('dice'),
  tags: ['random', 'dice'],
};

export default meta;
