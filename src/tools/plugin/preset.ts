import type { PresetSchema } from '../../core/template/schema';

/**
 * The one preset key is the fallback for a definition id. A template that uses
 * a tool file resolves against that file's own settings, not this schema; this
 * exists so the runtime itself still has a valid, round-trippable preset.
 */
const preset: PresetSchema = {
  definition: { type: 'string', default: '', label: 'Tool file id' },
};

export default preset;
