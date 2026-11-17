import type { ToolMeta } from '../../core/registry';

const meta: ToolMeta = {
  id: 'bag',
  title: 'Bag',
  blurb: 'Blind draws from tiles or tokens, with values and a tray.',
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8V6a4 4 0 0 1 8 0v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 8h14l-1.5 11a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="10" cy="13" r="1.3" fill="currentColor"/><circle cx="14" cy="15" r="1.3" fill="currentColor"/></svg>',
  tags: ['random', 'words', 'tokens'],
};

export default meta;
