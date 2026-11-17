import type { ToolMeta } from '../../core/registry';

const meta: ToolMeta = {
  id: 'dice',
  title: 'Dice',
  blurb: 'Roll any die or notation, with keep, reroll and exploding dice.',
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.4" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.4" fill="currentColor"/></svg>',
  tags: ['random', 'dice'],
};

export default meta;
