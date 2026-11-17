import type { ToolMeta } from '../../core/registry';
import { mark } from '../../core/ui/icons';

const meta: ToolMeta = {
  id: 'pick',
  title: 'Pick',
  blurb: 'Random numbers, lists, teams, seats and first player.',
  family: 'randomize',
  seats: 'multi',
  icon: mark('sparkle'),
  tags: ['random', 'party'],
};

export default meta;
