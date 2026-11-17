import type { ToolMeta } from '../../core/registry';
import { mark } from '../../core/ui/icons';

const meta: ToolMeta = {
  id: 'prompts',
  title: 'Prompts',
  blurb: 'Random ideas, party prompts and design constraints from themed packs.',
  family: 'randomize',
  icon: mark('paw'),
  tags: ['random', 'ideas', 'party'],
};

export default meta;
