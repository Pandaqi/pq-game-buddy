import type { ToolMeta } from '../../core/registry';
import { ICON } from './icon';

const meta: ToolMeta = {
  id: 'words',
  title: 'Words',
  blurb: 'Is “QI” a word? Check it, find anagrams, solve a rack or deal Codenames.',
  family: 'reference',
  seats: 'none',
  icon: ICON,
  tags: ['reference', 'words', 'solver'],
};

export default meta;
