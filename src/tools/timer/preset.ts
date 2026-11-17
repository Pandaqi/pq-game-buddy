import type { PresetSchema } from '../../core/template/schema';

const preset: PresetSchema = {
  mode: {
    type: 'enum',
    values: ['countdown', 'up', 'flip', 'chess', 'interval', 'sequence'],
    default: 'countdown',
  },
  duration: { type: 'duration', default: '5m' },
  'per-player': { type: 'boolean', default: false },
  players: { type: 'number', default: 2, min: 1, max: 12 },
  layout: { type: 'enum', values: ['single', 'grid', 'list'], default: 'single' },
  'warn-at': { type: 'duration', default: '30s' },
  sound: { type: 'enum', values: ['none', 'bell', 'buzzer', 'gong'], default: 'bell' },
  haptic: { type: 'enum', values: ['none', 'short', 'long'], default: 'short' },
  increment: { type: 'duration', default: '0s' },
  delay: { type: 'duration', default: '0s' },
  interval: { type: 'duration', default: '90s' },
  count: { type: 'number', default: 0, min: 0, max: 99 },
  phases: { type: 'pairs', default: {} },
  start: { type: 'enum', values: ['manual', 'auto'], default: 'manual' },
};

export default preset;
