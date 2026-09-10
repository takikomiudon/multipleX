const result = document.querySelector('#result');
const timeline = document.querySelector('[aria-label="Timeline: Home"] > div');
function check(condition, message) {
  if (!condition) {
    result.textContent = `FAIL: ${message}`;
    throw new Error(message);
  }
}
function appendPosts(start, end) {
  for (let index = start; index < end; index++) {
    const cell = document.createElement('div');
    cell.dataset.testid = 'cellInnerDiv';
    cell.style.transform = `translateY(${index * 220}px)`;
    cell.innerHTML = `<article data-testid="tweet">投稿 ${index + 1}<p>4列表示と共通スクロールの確認</p><button>操作ボタン</button></article>`;
    cell.firstElementChild.style.height = `${220 + (index % 4) * 60}px`;
    timeline.append(cell);
  }
}
function measureNativeTimeline(start = 0) {
  layoutTimelines();
  let top = start;
  for (const cell of timeline.children) {
    cell.style.transform = `translateY(${top}px)`;
    top += Math.ceil(cell.getBoundingClientRect().height);
  }
  timeline.style.minHeight = `${top}px`;
}
async function run() {
  appendPosts(0, 24);
  document.documentElement.classList.add('multiplex-home');
  measureNativeTimeline();
  const notice = document.createElement('div');
  notice.dataset.testid = 'cellInnerDiv';
  notice.innerHTML = '<button style="height:49px;width:100%">新しいポストを表示</button>';
  timeline.prepend(notice);
  measureNativeTimeline();
  check(notice.getBoundingClientRect().width === timeline.clientWidth, '新着通知は横幅全体を使う');
  check(notice.firstElementChild.getBoundingClientRect().top >= timeline.getBoundingClientRect().top, '新着通知が上に隠れない');
  await new Promise(requestAnimationFrame);
  const cells = [...timeline.children].filter(cell => cell.querySelectorAll('article').length > 0);
  const firstRow = cells.slice(0, 4).map(cell => cell.firstElementChild.getBoundingClientRect());
  check(firstRow[0].width >= (innerWidth - 280) / 4, 'メニュー以外の横幅を4列で使う');
  check(new Set(firstRow.map(rect => rect.x)).size === 4, '異なる4列に配置される');
  check(new Set(firstRow.map(rect => rect.y)).size === 1, '4列の先頭が揃う');
  check(cells[4].firstElementChild.getBoundingClientRect().top >= firstRow[0].bottom, '次の行と重ならない');
  check(document.documentElement.scrollWidth === innerWidth, '横にはみ出さない');
  window.scrollTo(0, 150);
  await new Promise(requestAnimationFrame);
  check(cells.slice(0, 4).every((cell, index) => Math.abs(firstRow[index].y - cell.firstElementChild.getBoundingClientRect().y - 150) < 1), '4列が同時に150pxスクロールする');
  appendPosts(24, 32);
  measureNativeTimeline();
  check(timeline.lastElementChild.getBoundingClientRect().bottom > cells[23].getBoundingClientRect().bottom, '追加投稿が下に並ぶ');
  const divider = notice.cloneNode(true);
  timeline.insertBefore(divider, cells[6]);
  measureNativeTimeline();
  check(divider.firstElementChild.getBoundingClientRect().top >= Math.max(cells[4].firstElementChild.getBoundingClientRect().bottom, cells[5].firstElementChild.getBoundingClientRect().bottom), '途中の案内行が投稿と重ならない');
  check(cells[6].firstElementChild.getBoundingClientRect().top >= divider.firstElementChild.getBoundingClientRect().bottom, '案内行の後から新しい行が始まる');
  divider.remove();
  measureNativeTimeline();
  const retainedTop = cells[4].firstElementChild.getBoundingClientRect().top;
  notice.remove();
  for (const cell of cells.slice(0, 2)) cell.remove();
  measureNativeTimeline(249);
  check(cells[4].firstElementChild.getBoundingClientRect().top === retainedTop, '仮想スクロールで先頭が消えても残る投稿は動かない');
  document.documentElement.classList.remove('multiplex-home');
  check(getComputedStyle(cells[4]).width === `${timeline.clientWidth}px`, 'ホーム以外では元の幅に戻る');
  document.documentElement.classList.add('multiplex-home');
  window.scrollTo(0, 0);
  result.textContent = 'PASS: 4列・行の重なり・横幅・共通スクロール・追加投稿・仮想スクロール・ホーム限定';
}
window.addEventListener('load', () => {
  requestAnimationFrame(() => requestAnimationFrame(run));
});
