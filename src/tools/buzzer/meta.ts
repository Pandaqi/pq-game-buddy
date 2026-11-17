import type { ToolMeta } from '../../core/registry';
import { ICON } from './icon';

const meta: ToolMeta = {
  id: 'buzzer',
  title: 'Buzzer',
  blurb: 'Who tapped first? Random start, reaction times and false starts.',
  family: 'time',
  seats: 'multi',
  icon: ICON,
  tags: ['time', 'party', 'quiz'],
};

export default meta;
