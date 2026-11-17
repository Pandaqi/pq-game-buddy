import type { PresetSchema } from '../../core/template/schema';

const preset: PresetSchema = {
  order: { type: 'list', default: [], label: 'Turn order (empty = session players)' },
  phases: { type: 'list', default: ['Turn'], label: 'Phases' },
  timer: { type: 'duration', default: '0s', label: 'Turn timer (0 = off)' },
  pass: { type: 'boolean', default: true, label: 'Pass-the-phone cover' },
  'auto-start': { type: 'boolean', default: false, label: 'Start the clock automatically' },
  mode: { type: 'enum', values: ['order', 'initiative'], default: 'order', label: 'Turn order or initiative' },
  initiative: { type: 'pairs', default: {}, label: 'Initiative per player' },
};

export default preset;
