/** The tool-file runtime's own words. A definition's words come from its file. */

const en = {
  title: 'Tool file',
  blurb: 'A tool defined by a .gamebuddy-tool file: its own blocks, its own settings.',
  'no-definition': 'This tool file is not installed',
  'no-definition-hint': 'Install the .gamebuddy-tool file it names, then open the game again.',
  roll: 'Roll',
  pick: 'Pick',
  shuffle: 'Reshuffle',
  reset: 'Reset',
  confirm: 'Tap again to confirm',
  'table-total': 'Total',
  'row-col': 'Row {row}, column {column}',
  'summary-empty': 'Nothing has been filled in yet.',
  'summary-checklist': '{label}: {done}/{total}',
  'summary-table': '{label}: {value}',
  'undo-change': 'tool change',
  'toast-no-command': 'That tool has no “{command}” action',
  'toast-no-script': 'That tool has no “{name}” script',
  'toast-script-error': 'The script “{name}” failed: {message}',
} as const;

export default en;
