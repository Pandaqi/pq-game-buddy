import type { PresetSchema } from '../../core/template/schema';

const preset: PresetSchema = {
  players: { type: 'number', default: 4, min: 1, max: 8, label: 'Buzzers' },
  delay: { type: 'duration', default: '3s', label: 'Longest random arm delay' },
  'false-start': { type: 'boolean', default: true, label: 'Detect false starts' },
  rounds: { type: 'number', default: 5, min: 1, max: 50, label: 'Rounds' },
  keys: { type: 'boolean', default: true, label: 'Keyboard lanes (A S D F J K L ;)' },
};

export default preset;
