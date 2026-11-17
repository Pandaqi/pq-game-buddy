import type { ToolMeta } from '../../core/registry';
import { mark } from '../../core/ui/icons';

const meta: ToolMeta = {
  id: 'bag',
  title: 'Bag',
  blurb: 'Blind draws from tiles or tokens, with values and a tray.',
  family: 'randomize',
  icon: mark('token'),
  tags: ['random', 'words', 'tokens'],
};

export default meta;
