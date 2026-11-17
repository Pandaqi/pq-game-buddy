import type { ToolMeta } from '../../core/registry';
import { mark } from '../../core/ui/icons';

const meta: ToolMeta = {
  id: 'words',
  title: 'Words',
  blurb: 'Is it a word? Find anagrams, solve a rack, draw letters or a Codenames board.',
  family: 'reference',
  icon: mark('words'),
  tags: ['reference', 'words', 'solver'],
};

export default meta;
