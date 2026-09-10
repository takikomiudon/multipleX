const result = document.querySelector('#result');
const caret = document.querySelector('[data-testid="caret"]');
const actions = [];
let labels = ['ブロック', 'このポストに興味がない'];
caret.addEventListener('click', () => {
  caret.setAttribute('aria-expanded', 'true');
  const menu = document.createElement('div');
  menu.setAttribute('role', 'menu');
  for (const label of labels) {
    const item = document.createElement('button');
    item.setAttribute('role', 'menuitem');
    item.textContent = label;
    item.addEventListener('click', () => {
      actions.push(label);
      menu.remove();
      caret.setAttribute('aria-expanded', 'false');
    });
    menu.append(item);
  }
  document.body.append(menu);
});
function check(condition, message) {
  if (!condition) {
    result.textContent = `FAIL: ${message}`;
    throw new Error(message);
  }
}
async function runFeedbackTests() {
  check(typeof labelFeedbackButtons === 'function', '興味なしボタンの処理が存在する');
  labelFeedbackButtons();
  check(caret.getAttribute('aria-label') === 'このポストに興味がない', 'ボタンの読み上げ名が置き換わる');
  check(getComputedStyle(caret).minHeight === '20px', 'ボタンが名前の行を32pxに押し広げない');
  caret.click();
  caret.click();
  await new Promise(requestAnimationFrame);
  check(actions.join() === 'このポストに興味がない', '連打しても正しい項目だけを1回実行する');
  labels = ['広告を報告', 'この広告に興味がない'];
  caret.click();
  await new Promise(requestAnimationFrame);
  check(actions.at(-1) === 'この広告に興味がない', '広告でも専用の興味なし項目を実行する');
  labels = ['ポストを削除', 'ポストを報告'];
  caret.click();
  await new Promise(resolve => setTimeout(resolve, 3100));
  check(actions.length === 2, '対象項目がないとき他の操作を実行しない');
  check(document.querySelectorAll('[role="alert"]').length === 1, '対象項目がない理由を表示する');
  document.documentElement.classList.remove('multiplex-home');
  labelFeedbackButtons();
  check(caret.getAttribute('aria-label') === 'もっと見る', 'ホーム以外では元のラベルに戻る');
  for (const menu of document.querySelectorAll('[role="menu"]')) menu.remove();
  caret.click();
  await new Promise(requestAnimationFrame);
  check(actions.length === 2, 'ホーム以外では自動実行しない');
  result.textContent = 'PASS: ラベル・正確な項目選択・連打防止・広告・項目なしのエラー・ホーム限定';
}
runFeedbackTests();
