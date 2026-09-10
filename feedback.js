const feedbackCaret = '.multiplex-home [data-testid="primaryColumn"] article[data-testid="tweet"] button[data-testid="caret"]';
const feedbackLabels = new Set(['このポストに興味がない', 'この広告に興味がない']);
const feedbackNames = new WeakMap();
let feedbackBusy = false;

function labelFeedbackButtons() {
  for (const caret of document.querySelectorAll('[data-testid="primaryColumn"] article[data-testid="tweet"] button[data-testid="caret"]')) {
    if (!document.documentElement.classList.contains('multiplex-home')) {
      if (feedbackNames.has(caret)) {
        caret.setAttribute('aria-label', feedbackNames.get(caret));
        caret.removeAttribute('title');
        feedbackNames.delete(caret);
      }
      continue;
    }
    if (!feedbackNames.has(caret)) feedbackNames.set(caret, caret.getAttribute('aria-label'));
    caret.setAttribute('aria-label', 'このポストに興味がない');
    caret.title = 'このポストに興味がない';
  }
}

function feedbackError(caret, message) {
  const error = document.createElement('span');
  error.className = 'multiplex-feedback-error';
  error.setAttribute('role', 'alert');
  error.textContent = message;
  caret.insertAdjacentElement('afterend', error);
  console.error(`[multipleX] ${message}`);
}

document.addEventListener('click', event => {
  const carets = event.composedPath().filter(node => node instanceof Element && node.matches(feedbackCaret));
  if (carets.length !== 1) return;
  const [caret] = carets;
  if (feedbackBusy) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  for (const error of document.querySelectorAll('.multiplex-feedback-error')) error.remove();
  if (document.querySelectorAll('[role="menu"]').length > 0) {
    event.preventDefault();
    event.stopImmediatePropagation();
    feedbackError(caret, '開いているXのメニューを閉じてから押してください。');
    return;
  }
  feedbackBusy = true;
  caret.setAttribute('aria-busy', 'true');
  const observer = new MutationObserver(() => {
    if (!caret.isConnected || caret.getAttribute('aria-expanded') !== 'true') return;
    const menus = document.querySelectorAll('[role="menu"]');
    if (menus.length !== 1) return;
    const items = [...menus[0].querySelectorAll('[role="menuitem"]')].filter(item => feedbackLabels.has(item.textContent.trim()));
    if (items.length !== 1) return;
    finish();
    items[0].click();
  });
  const timeout = setTimeout(() => {
    finish();
    feedbackError(caret, 'Xのメニューから「興味がない」を取得できませんでした（3秒）。');
  }, 3000);
  function finish() {
    observer.disconnect();
    clearTimeout(timeout);
    feedbackBusy = false;
    caret.removeAttribute('aria-busy');
  }
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-expanded'] });
}, true);
