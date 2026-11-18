/** 도구 파일 실행기의 문구. 정의의 말은 그 파일에서 옵니다. */

const ko = {
  title: '도구 파일',
  blurb: '.gamebuddy-tool 파일로 정해지는 도구: 자기 블록, 자기 설정.',
  'no-definition': '이 도구 파일은 설치되지 않았습니다',
  'no-definition-hint': '이 파일이 가리키는 .gamebuddy-tool을 설치한 뒤 게임을 다시 여세요.',
  roll: '굴리기',
  pick: '뽑기',
  shuffle: '다시 섞기',
  reset: '되돌리기',
  confirm: '한 번 더 누르면 확정',
  'table-total': '합계',
  'row-col': '{row}행 {column}열',
  'summary-empty': '아직 아무것도 채우지 않았습니다.',
  'summary-checklist': '{label}: {done}/{total}',
  'summary-table': '{label}: {value}',
  'undo-change': '도구 변경',
  'toast-no-command': '그 도구에는 “{command}” 동작이 없습니다',
  'toast-no-script': '그 도구에는 “{name}” 스크립트가 없습니다',
  'toast-script-error': '스크립트 “{name}”이 실패했습니다: {message}',
} as const;

export default ko;
