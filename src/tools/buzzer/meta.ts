import type { ToolMeta } from '../../core/registry';
import { mark } from '../../core/ui/icons';

const meta: ToolMeta = {
  id: 'buzzer',
  title: 'Buzzer',
  blurb: 'First tap wins, with a random start, reaction times and false starts.',
  family: 'time',
  icon: mark('key'),
  tags: ['time', 'party', 'quiz'],
};

export default meta;
