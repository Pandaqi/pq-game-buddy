import type { ToolMeta } from '../../core/registry';
import { mark } from '../../core/ui/icons';

const meta: ToolMeta = {
  id: 'rules',
  title: 'Rules',
  blurb: 'A quick card, setup checklist, rules text, scoring reference and glossary.',
  family: 'reference',
  seats: 'none',
  icon: mark('book'),
  tags: ['reference', 'rules'],
};

export default meta;
