import type { ToolMeta } from '../../core/registry';
import { ICON } from './icon';

const meta: ToolMeta = {
  id: 'timer',
  title: 'Timer',
  blurb: 'Count down, count up, flip between turns, or run a chess clock.',
  family: 'time',
  seats: 'one',
  icon: ICON,
  tags: ['time', 'clock', 'party'],
};

export default meta;
