/** 工具文件运行时的文案。定义自己的文字来自它的文件。 */

const zh = {
  title: '工具文件',
  blurb: '由 .gamebuddy-tool 文件定义的工具：自己的区块、自己的设置。',
  'no-definition': '这个工具文件没有安装',
  'no-definition-hint': '装上它指明的 .gamebuddy-tool 文件，再打开游戏。',
  roll: '掷',
  pick: '抽',
  shuffle: '重洗',
  reset: '重置',
  confirm: '再点一次确认',
  'table-total': '合计',
  'row-col': '第 {row} 行第 {column} 列',
  'summary-empty': '还什么都没填。',
  'summary-checklist': '{label}：{done}/{total}',
  'summary-table': '{label}：{value}',
  'undo-change': '工具变化',
  'toast-no-command': '那个工具没有“{command}”这个动作',
  'toast-no-script': '那个工具没有“{name}”脚本',
  'toast-script-error': '脚本“{name}”失败了：{message}',
} as const;

export default zh;
