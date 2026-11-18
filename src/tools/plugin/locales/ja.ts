/** ツールファイルの仕組みの言葉。定義の言葉はそのファイルから来ます。 */

const ja = {
  title: 'ツールファイル',
  blurb: '.gamebuddy-toolファイルで決まるツール：自分のブロック、自分の設定。',
  'no-definition': 'このツールファイルは入っていません',
  'no-definition-hint': 'このファイルが示す.gamebuddy-toolを入れてから、もう一度ゲームを開いてください。',
  roll: '振る',
  pick: '選ぶ',
  shuffle: '切り直す',
  reset: '戻す',
  confirm: 'もう一度押すと確定',
  'table-total': '合計',
  'row-col': '{row}行{column}列',
  'summary-empty': 'まだ何も書き込まれていません。',
  'summary-checklist': '{label}：{done}/{total}',
  'summary-table': '{label}：{value}',
  'undo-change': 'ツールの変更',
  'toast-no-command': 'そのツールに「{command}」の動きはありません',
  'toast-no-script': 'そのツールに「{name}」のスクリプトはありません',
  'toast-script-error': 'スクリプト「{name}」が失敗しました：{message}',
} as const;

export default ja;
