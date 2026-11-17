import type { ToolMeta } from '../../core/registry';
import { ICON } from './icon';

const meta: ToolMeta = {
  id: 'rules',
  title: 'Rules',
  blurb: 'The rules card, setup list, scoring reference and glossary on one screen.',
  family: 'reference',
  seats: 'none',
  icon: ICON,
  tags: ['reference', 'rules'],
};

export default meta;
