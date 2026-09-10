let scrollSpeed = 60;
let scrollRunning = false;
let scrollFrame = 0;
let scrollTime = 0;
let scrollRemainder = 0;

function scrollTick(time) {
  scrollRemainder += scrollSpeed * (time - scrollTime) / 1000;
  scrollTime = time;
  const pixels = Math.floor(scrollRemainder);
  scrollRemainder -= pixels;
  window.scrollBy({ top: pixels, behavior: 'instant' });
  scrollFrame = requestAnimationFrame(scrollTick);
}

function updateScrollLoop() {
  cancelAnimationFrame(scrollFrame);
  scrollTime = performance.now();
  scrollRemainder = 0;
  if (scrollRunning && !document.hidden) scrollFrame = requestAnimationFrame(scrollTick);
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message.type !== 'multiplex-scroll:get' && message.type !== 'multiplex-scroll:set') return;
  if (location.pathname !== '/home') {
    respond({ error: 'Xのホーム画面で使用してください。' });
    return;
  }
  if (message.type === 'multiplex-scroll:set') {
    if (!Number.isInteger(message.speed) || message.speed < 10 || message.speed > 300 || typeof message.running !== 'boolean') {
      respond({ error: '速度は10〜300px/秒で指定してください。' });
      return;
    }
    scrollSpeed = message.speed;
    scrollRunning = message.running;
    updateScrollLoop();
  }
  respond({ speed: scrollSpeed, running: scrollRunning });
});

document.addEventListener('visibilitychange', updateScrollLoop);
navigation.addEventListener('navigatesuccess', () => {
  if (location.pathname !== '/home') {
    scrollRunning = false;
    updateScrollLoop();
  }
});
