/** Słowa środowiska plików narzędzi. Słowa definicji pochodzą z jej pliku. */

const pl = {
  title: 'Plik narzędzia',
  blurb: 'Narzędzie z pliku .gamebuddy-tool: własne bloki, własne ustawienia.',
  'no-definition': 'Ten plik narzędzia nie jest zainstalowany',
  'no-definition-hint': 'Zainstaluj plik .gamebuddy-tool, który nazywa, potem otwórz grę jeszcze raz.',
  roll: 'Rzuć',
  pick: 'Wylosuj',
  shuffle: 'Przetasuj',
  reset: 'Reset',
  confirm: 'Dotknij jeszcze raz, żeby potwierdzić',
  'table-total': 'Suma',
  'row-col': 'Wiersz {row}, kolumna {column}',
  'summary-empty': 'Nic jeszcze nie wpisano.',
  'summary-checklist': '{label}: {done}/{total}',
  'summary-table': '{label}: {value}',
  'undo-change': 'zmiana w narzędziu',
  'toast-no-command': 'To narzędzie nie ma akcji „{command}”',
  'toast-no-script': 'To narzędzie nie ma skryptu „{name}”',
  'toast-script-error': 'Skrypt „{name}” zawiódł: {message}',
} as const;

export default pl;
