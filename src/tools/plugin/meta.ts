import type { ToolMeta } from '../../core/registry';
import { ICON } from './icon';

const meta: ToolMeta = {
  id: 'plugin',
  title: 'Tool file',
  blurb: 'A tool defined by a .gamebuddy-tool file: its own blocks, its own settings.',
  family: 'reference',
  seats: 'multi',
  icon: ICON,
  // Never on the shelf: it is the runtime an installed definition borrows, not
  // a tool anyone starts on its own.
  tags: ['plugin', 'dev'],
};

export default meta;
