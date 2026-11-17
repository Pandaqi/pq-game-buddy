import type { PresetSchema } from '../../core/template/schema';

const preset: PresetSchema = {
  mode: { type: 'enum', values: ['roles', 'ballot', 'bid'], default: 'roles' },
  roles: { type: 'pairs', default: {}, label: 'Roles (name=count)' },
  descriptions: { type: 'pairs', default: {}, label: 'Role descriptions' },
  'auto-hide': { type: 'number', default: 8, min: 0, max: 120, label: 'Seconds before a secret hides' },
  ballot: { type: 'string', default: 'Who goes first?', label: 'Ballot question' },
  options: { type: 'list', default: [], label: 'Ballot options' },
  'min-bid': { type: 'number', default: 0, min: 0, max: 100000, label: 'Lowest bid' },
  'max-bid': { type: 'number', default: 100, min: 1, max: 100000, label: 'Highest bid' },
};

export default preset;
