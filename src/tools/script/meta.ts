import type { ToolMeta } from '../../core/registry';
import { mark } from '../../core/ui/icons';

const meta: ToolMeta = {
  id: 'script',
  title: 'Script',
  blurb: 'Run a game flow step by step: say, wait, reveal and time.',
  family: 'flow',
  icon: mark('scroll'),
  tags: ['flow', 'narrator', 'party'],
};

export default meta;
