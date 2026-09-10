const result = document.querySelector('#result');
let receive;
const chromeMock = {
  runtime: { onMessage: { addListener(fn) { receive = fn; } } },
  tabs: {
    async query() { return [{ id: 1 }]; },
    async sendMessage(id, message) { return new Promise(resolve => receive(message, {}, resolve)); },
  },
};
window.chromeMock = chromeMock;
function check(condition, message) {
  if (!condition) {
    result.textContent = `FAIL: ${message}`;
    throw new Error(message);
  }
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function run() {
  // Only the extension messaging and route are mocked; scrolling and popup code are real.
  const source = await fetch('autoscroll.js').then(response => response.text());
  new Function('chrome', 'location', source)(chromeMock, { pathname: '/home' });
  const popup = await fetch('popup.html').then(response => response.text());
  const frame = document.querySelector('iframe');
  const loaded = new Promise(resolve => frame.addEventListener('load', resolve, { once: true }));
  frame.srcdoc = popup.replace('<script src="popup.js">', '<script>window.chrome = parent.chromeMock;</script><script src="popup.js">');
  await loaded;
  await wait(50);
  const controls = frame.contentDocument;
  const toggle = controls.querySelector('#toggle');
  const speed = controls.querySelector('#speed');
  check(!toggle.disabled, 'ポップアップが接続する');
  toggle.click();
  await wait(1000);
  check(scrollY >= 40 && scrollY <= 85, '初期速度60px/秒でスクロール');
  speed.value = '180';
  speed.dispatchEvent(new Event('input'));
  await wait(50);
  const before = scrollY;
  await wait(1000);
  check(scrollY - before >= 150 && scrollY - before <= 220, '速度変更を即時反映');
  toggle.click();
  await wait(50);
  const stopped = scrollY;
  await wait(200);
  check(scrollY === stopped, '停止ボタンで止まる');
  check(controls.querySelector('#value').value === '180 px/秒', '速度を表示');
  check(toggle.textContent === '開始', '停止後に開始ボタンへ戻る');
  result.textContent = 'PASS: ポップアップの開始・速度変更・停止と実スクロール';
}
run();
