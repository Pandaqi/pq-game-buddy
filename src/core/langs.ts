/** Every language the app can name. A build ships whichever of them it is asked for. */

export interface LanguageInfo {
  id: string;
  /** The language's own name, the way a speaker looks for it in a list. */
  label: string;
  /** Its English name, as the quiet second line in the language sheet. */
  english: string;
}

export const LANGUAGES: LanguageInfo[] = [
  { id: 'en', label: 'English', english: 'English' },
  { id: 'nl', label: 'Nederlands', english: 'Dutch' },
  { id: 'de', label: 'Deutsch', english: 'German' },
  { id: 'es', label: 'Español', english: 'Spanish' },
  { id: 'fr', label: 'Français', english: 'French' },
  { id: 'pt', label: 'Português', english: 'Portuguese' },
  { id: 'it', label: 'Italiano', english: 'Italian' },
  { id: 'id', label: 'Bahasa Indonesia', english: 'Indonesian' },
  { id: 'tr', label: 'Türkçe', english: 'Turkish' },
  { id: 'vi', label: 'Tiếng Việt', english: 'Vietnamese' },
];

/**
 * The language the app starts in when nothing else is stored. Like every other
 * language it is a chunk, loaded before the first paint.
 */
export const DEFAULT_LANGUAGE = 'en';

export function languageInfo(id: string): LanguageInfo | undefined {
  return LANGUAGES.find((item) => item.id === id);
}
