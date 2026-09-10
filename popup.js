const speed = document.querySelector('#speed');
const value = document.querySelector('#value');
const toggle = document.querySelector('#toggle');
const error = document.querySelector('#error');
let running = false;

function showError(reason) {
  error.textContent = `Xのホームを開き、拡張更新後はページを再読み込みしてください。詳細: ${reason.message}`;
  speed.disabled = true;
  toggle.disabled = true;
}

function render(state) {
  if ('error' in state) {
    showError(new Error(state.error));
    return;
  }
  running = state.running;
  speed.value = state.speed;
  value.value = `${state.speed} px/秒`;
  toggle.textContent = '開始';
  if (running) toggle.textContent = '停止';
  speed.disabled = false;
  toggle.disabled = false;
}

chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
  function send(message) {
    chrome.tabs.sendMessage(tab.id, message).then(render, showError);
  }
  send({ type: 'multiplex-scroll:get' });
  speed.addEventListener('input', () => {
    value.value = `${speed.value} px/秒`;
    send({ type: 'multiplex-scroll:set', speed: Number(speed.value), running });
  });
  toggle.addEventListener('click', () => {
    toggle.disabled = true;
    send({ type: 'multiplex-scroll:set', speed: Number(speed.value), running: !running });
  });
}, showError);
