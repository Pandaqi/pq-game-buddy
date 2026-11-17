/** Translation lookup with interpolation. English is the only dictionary for now. */

const strings: Record<string, string> = {
  'app.name': 'Game Buddy',
  'app.tagline': 'Little tools for game night',
  'nav.home': 'Home',
  'nav.settings': 'Settings',
  'nav.back': 'Back',
  'home.continue': 'Continue playing',
  'home.tools': 'Tools',
  'home.search': 'Search tools',
  'home.templates': 'Try a template',
  'home.import': 'Import a template',
  'home.empty': 'No tools match that search.',
  'home.sound': 'Sound',
  'session.close': 'Close game',
  'session.undo': 'Undo',
  'session.players': 'Players',
  'session.none': 'Nothing is running yet.',
  'settings.title': 'Settings',
  'settings.theme': 'Theme',
  'settings.theme.system': 'System',
  'settings.theme.light': 'Light',
  'settings.theme.dark': 'Dark',
  'settings.table': 'Table mode',
  'settings.table.hint': 'Huge type and bigger targets for a phone lying on the table.',
  'settings.motion': 'Motion',
  'settings.motion.system': 'System',
  'settings.motion.reduce': 'Reduced',
  'settings.motion.allow': 'Full',
  'settings.volume': 'Volume',
  'settings.mute': 'Mute',
  'settings.haptics': 'Vibration',
  'settings.storage': 'Saving',
  'settings.storage.memory': 'This browser cannot save. Export your session instead.',
  'settings.storage.session': 'Saving only while this tab stays open.',
  'settings.storage.local': 'Saved on this device.',
  'settings.reset': 'Reset all data',
  'settings.reset.hint': 'Deletes saved sessions and settings from this device.',
  'settings.about': 'About',
  'import.title': 'Import a template',
  'import.paste': 'Paste template text',
  'import.file': 'Choose a file',
  'import.run': 'Load template',
  'import.cancel': 'Cancel',
  'import.drop': 'Drop a .gamebuddy file',
  'seats.title': 'How many players?',
  'seats.start': 'Start game',
  'confirm.yes': 'Yes, do it',
  'confirm.no': 'Cancel',
  'error.title': 'Something broke',
  'error.reset': 'Back to home',
  'notfound.title': 'That page does not exist',
  'notfound.home': 'Go home',
};

export type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function t(key: string, vars?: Record<string, string | number>): string {
  const template = strings[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function hasKey(key: string): boolean {
  return key in strings;
}
