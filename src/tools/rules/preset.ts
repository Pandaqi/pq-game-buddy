import type { PresetSchema } from '../../core/template/schema';

const preset: PresetSchema = {
  quick: { type: 'text', default: '', label: 'Quick card (one line)' },
  rules: { type: 'text', default: '', label: 'Rules text' },
  setup: { type: 'list', default: [], label: 'Setup checklist' },
  glossary: { type: 'pairs', default: {}, label: 'Glossary (term=definition)' },
  scoring: { type: 'pairs', default: {}, label: 'Scoring reference (name=points)' },
  source: { type: 'string', default: '', label: 'Source link' },
};

export default preset;
