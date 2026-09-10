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
  const beforeEmpty = cells.slice(0, 8).map(cell => cell.firstElementChild.getBoundingClientRect().toJSON());
  for (const position of [1, 2, 3]) {
    const empty = document.createElement('div');
    empty.dataset.testid = 'cellInnerDiv';
    empty.innerHTML = '<div class="css-g5y9jx r-1adg3ll r-1ny4l3l"></div>';
    timeline.insertBefore(empty, cells[position]);
    measureNativeTimeline();
    check(empty.getBoundingClientRect().height === 0, '空の要素は改行用の高さを持たない');
    check(cells.slice(0, 8).every((cell, index) => {
      const rect = cell.firstElementChild.getBoundingClientRect();
      return rect.x === beforeEmpty[index].x && rect.y === beforeEmpty[index].y;
    }), '空の要素で右側の列を空けない');
    empty.remove();
    measureNativeTimeline();
  }
  const firstRow = cells.slice(0, 4).map(cell => cell.firstElementChild.getBoundingClientRect());
  check(firstRow[0].width >= (innerWidth - 280) / 4, 'メニュー以外の横幅を4列で使う');
  check(new Set(firstRow.map(rect => rect.x)).size === 4, '異なる4列に配置される');
  check(new Set(firstRow.map(rect => rect.y)).size === 1, '4列の先頭が揃う');
  check(cells[4].firstElementChild.getBoundingClientRect().top >= firstRow[0].bottom, '次の行と重ならない');
  check(document.documentElement.scrollWidth === innerWidth, '横にはみ出さない');
  check(getComputedStyle(cells[4].firstElementChild, '::before').borderBottomWidth === '1px', '余白の下の投稿に上線を描く');
  check(getComputedStyle(cells[4].firstElementChild, '::before').top === '-1px', '上線を投稿の上端の外側に置き、直上の投稿の下線と揃える');
  check(getComputedStyle(cells[4].firstElementChild, '::before').borderBottomColor === getComputedStyle(cells[4].firstElementChild).borderBottomColor, '上線は既存の下線と同じ色');
  check(getComputedStyle(cells[7].firstElementChild, '::before').content === 'none', '接している投稿には上線を重ねない');
  cells[3].firstElementChild.style.height = '403px';
  measureNativeTimeline();
  check(getComputedStyle(cells[7].firstElementChild, '::before').content === 'none', '丸めで1px空いても上線を重ねない');
  cells[3].firstElementChild.style.height = '400px';
  measureNativeTimeline();
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
  const postRect = cells[5].getBoundingClientRect();
  cells[5].firstElementChild.removeAttribute('data-testid');
  cells[5].firstElementChild.textContent = 'ご協力ありがとうございます。フィードバックはタイムラインの精度向上に利用します。';
  cells[5].firstElementChild.style.height = '74px';
  measureNativeTimeline(249);
  check(cells[5].getBoundingClientRect().width === postRect.width, '興味なしのお礼も元の投稿と同じ幅');
  check(cells[5].getBoundingClientRect().x === postRect.x, '興味なしのお礼も元の列に残る');
  document.documentElement.classList.remove('multiplex-home');
  check(getComputedStyle(cells[4]).width === `${timeline.clientWidth}px`, 'ホーム以外では元の幅に戻る');
  document.documentElement.classList.add('multiplex-home');
  for (const cell of cells.slice(21, 23)) {
    const connector = document.createElement('div');
    connector.className = 'r-1bnu78o r-m5arl1 r-1p0dtai';
    cell.firstElementChild.prepend(connector);
  }
  measureNativeTimeline(249);
  const thread = cells.slice(20, 23).map(cell => cell.firstElementChild.getBoundingClientRect());
  check(new Set(thread.map(rect => rect.x)).size === 1, '親と複数のリプライを同じ列にする');
  check(thread[1].top === thread[0].bottom && thread[2].top === thread[1].bottom, 'リプライを親の直下に隙間なく並べる');
  check(getComputedStyle(cells[21].firstElementChild, '::before').content === 'none', 'リプライに上線を追加しない');
  check(cells[23].firstElementChild.getBoundingClientRect().top === thread[0].top, '次の独立した投稿は隣の列に並ぶ');
  const replyTop = cells[21].firstElementChild.getBoundingClientRect().top;
  const nativeTop = Number.parseFloat(cells[21].style.transform.slice(11));
  for (const cell of [...timeline.children]) {
    if (cell === cells[21]) break;
    cell.remove();
  }
  measureNativeTimeline(nativeTop);
  check(cells[21].firstElementChild.getBoundingClientRect().top === replyTop, '親が画面外で削除されてもリプライの位置を維持する');
  const nextPost = cells[23].firstElementChild.getBoundingClientRect();
  const ad = document.createElement('div');
  ad.dataset.testid = 'cellInnerDiv';
  ad.innerHTML = '<div data-testid="placementTracking"><article data-testid="tweet" style="height:600px">広告の商品</article></div>';
  timeline.insertBefore(ad, cells[23]);
  cells[23].firstElementChild.insertAdjacentHTML('beforeend', '<div data-testid="placementTracking">広告について書いた通常の投稿</div>');
  measureNativeTimeline(nativeTop);
  check(getComputedStyle(ad).display === 'none', '広告の投稿を非表示にする');
  check(ad.getBoundingClientRect().height === 0, '広告の高さを残さない');
  check(cells[23].firstElementChild.getBoundingClientRect().x === nextPost.x && cells[23].firstElementChild.getBoundingClientRect().top === nextPost.top, '広告の空き列を残さない');
  check(getComputedStyle(cells[23]).display !== 'none', '本文に広告と書いた通常の投稿は隠さない');
  document.documentElement.classList.remove('multiplex-home');
  check(getComputedStyle(ad).display !== 'none', 'ホーム以外の広告表示は変更しない');
  document.documentElement.classList.add('multiplex-home');
  window.scrollTo(0, 0);
  result.textContent = 'PASS: 4列・共通スクロール・通知・お礼・スレッド・広告非表示・仮想スクロール・ホーム限定';
}
window.addEventListener('load', () => {
  requestAnimationFrame(() => requestAnimationFrame(run));
});
