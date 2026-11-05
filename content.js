const lists = new WeakMap();
const observed = new Set();
const timelineSelector = '[data-testid="primaryColumn"] section [aria-label] > div:has(> [data-testid="cellInnerDiv"])';
const statusLinkSelector = 'article[data-testid="tweet"] a[href]:has(> time)';
let scheduled = false;
let homeReturn;
const resizeObserver = new ResizeObserver(scheduleLayout);

function scheduleLayout() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    if (location.pathname !== '/home') return;
    layoutTimelines();
    restoreHomePosition();
    labelFeedbackButtons();
  });
}

function layoutTimelines() {
  for (const child of observed) {
    if (!child.isConnected) {
      resizeObserver.unobserve(child);
      observed.delete(child);
    }
  }
  for (const list of document.querySelectorAll(timelineSelector)) {
    list.style.setProperty('--multiplex-divider-color', getComputedStyle(list.closest('[data-testid="primaryColumn"]')).borderBottomColor);
    if (!lists.has(list)) lists.set(list, { indices: new WeakMap(), parts: new WeakMap(), groups: new Map(), heights: new Map() });
    const cells = [...list.children].filter(cell => cell.dataset.testid === 'cellInnerDiv');
    reuseHomeLayout(list, cells);
    const state = lists.get(list);
    const skipped = new Set(cells.filter(cell =>
      cell.querySelectorAll('[data-testid="placementTracking"] article[data-testid="tweet"]').length > 0
      || (cell.querySelectorAll('article').length === 0
        && [...cell.children].every(child => child.getBoundingClientRect().height === 0))));
    for (const cell of skipped) {
      cell.style.setProperty('--multiplex-height', '0px');
      cell.style.setProperty('--multiplex-offset', '0px');
      cell.classList.remove('multiplex-top-border');
      if (state.indices.has(cell)) {
        state.groups.get(state.indices.get(cell)).delete(state.parts.get(cell));
        state.indices.delete(cell);
        state.parts.delete(cell);
      }
    }
    const entries = cells.filter(cell => !skipped.has(cell)).map(cell => ({
      cell,
      fullWidth: cell.querySelectorAll('article').length === 0,
      // X's upper conversation connector, observed on replies in the home timeline.
      reply: cell.querySelectorAll('article .r-1bnu78o.r-m5arl1.r-1p0dtai').length > 0
        || (state.parts.has(cell) && state.parts.get(cell) > 0 && cell.querySelectorAll('[data-testid="tweet"]').length === 0),
      height: [...cell.children].reduce((sum, child) => sum + child.getBoundingClientRect().height, 0),
      index: 0,
      part: 0,
    }));
    let start = 0;
    let firstPart = 0;
    let anchored = false;
    for (let index = 0; index < entries.length; index++) {
      if (state.indices.has(entries[index].cell)) {
        anchored = true;
        start = state.indices.get(entries[index].cell);
        if (entries.slice(1, index + 1).every(entry => entry.reply)) {
          firstPart = Math.max(0, state.parts.get(entries[index].cell) - index);
        }
        for (let previous = index - 1; previous >= 0; previous--) {
          if (entries[previous].fullWidth) start = Math.floor(start / 4) * 4 - 4;
          else if (!entries[previous + 1].reply) start--;
        }
        break;
      }
    }
    if (!anchored) {
      state.heights.clear();
      state.groups.clear();
    }
    for (const { cell } of entries) {
      if (state.indices.has(cell)) state.groups.get(state.indices.get(cell)).delete(state.parts.get(cell));
    }
    for (let position = 0; position < entries.length; position++) {
      const entry = entries[position];
      const { cell } = entry;
      entry.index = start;
      if (entry.fullWidth) {
        state.indices.delete(cell);
        state.parts.delete(cell);
        start = Math.ceil(start / 4) * 4 + 4;
      } else {
        if (position > 0 && entry.reply && !entries[position - 1].fullWidth) {
          entry.index = entries[position - 1].index;
          entry.part = entries[position - 1].part + 1;
        } else {
          if (position === 0) entry.part = firstPart;
          start++;
        }
        state.indices.set(cell, entry.index);
        state.parts.set(cell, entry.part);
        if (!state.groups.has(entry.index)) state.groups.set(entry.index, new Map());
        state.groups.get(entry.index).set(entry.part, entry.height);
      }
      for (const child of cell.children) {
        if (!observed.has(child)) {
          resizeObserver.observe(child);
          observed.add(child);
        }
      }
    }
    for (const [index, members] of state.groups) {
      state.heights.set(index, [...members.values()].reduce((sum, height) => sum + height, 0));
    }
    for (const { cell, index, part, height, fullWidth } of entries) {
      cell.classList.toggle('multiplex-top-border', !fullWidth && needsTopBorder(index, part, state.heights));
      if (fullWidth) {
        const divider = layoutDivider(index, height, state.heights);
        cell.style.setProperty('--multiplex-width', '100%');
        cell.style.setProperty('--multiplex-left', '0%');
        cell.style.setProperty('--multiplex-height', `${divider.height}px`);
        cell.style.setProperty('--multiplex-offset', `${divider.offset}px`);
        continue;
      }
      const slot = layoutThreadSlot(index, part, state.groups.get(index), state.heights);
      cell.style.setProperty('--multiplex-border-top', `${-1 - layoutSlot(index - 4, state.heights).rounding}px`);
      cell.style.setProperty('--multiplex-width', '25%');
      cell.style.setProperty('--multiplex-left', `${slot.column * 25}%`);
      cell.style.setProperty('--multiplex-height', `${slot.height}px`);
      cell.style.setProperty('--multiplex-offset', `${-slot.offset}px`);
    }
  }
}

function clearHomeReturn() {
  if (!homeReturn) return;
  document.adoptedStyleSheets = document.adoptedStyleSheets.filter(sheet => sheet !== homeReturn.sheet);
  homeReturn = undefined;
}

function saveHomePosition(event) {
  if (location.pathname !== '/home') return;
  clearHomeReturn();
  if (!event.destination.sameDocument || !/^\/[^/]+\/status\/\d+$/.test(new URL(event.destination.url).pathname)) return;

  const rules = [];
  const layouts = new Map();
  let anchor;
  const scrollY = window.scrollY;
  const viewport = document.documentElement.clientHeight;
  for (const list of document.querySelectorAll(timelineSelector)) {
    if (!lists.has(list)) continue;
    const label = list.parentElement.getAttribute('aria-label');
    const listSelector = `.multiplex-home [data-testid="primaryColumn"] section [aria-label="${CSS.escape(label)}"] > div`;
    const state = lists.get(list);
    const posts = new Map();
    for (const cell of list.children) {
      if (!state.indices.has(cell)) continue;
      const link = cell.querySelector(statusLinkSelector);
      if (!link) continue;
      const href = link.getAttribute('href');
      posts.set(href, { index: state.indices.get(cell), part: state.parts.get(cell) });
      const selector = `${listSelector} > [data-testid="cellInnerDiv"]:has(article[data-testid="tweet"] a[href="${CSS.escape(href)}"] > time)`;
      const properties = ['width', 'height', 'left', 'offset'].map(name => `--multiplex-${name}:${cell.style.getPropertyValue(`--multiplex-${name}`)}`).join(';');
      rules.push(`${selector}{${properties}}`);
      if (anchor) continue;
      const rect = link.closest('article').getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < viewport) {
        const nativeHeight = Number.parseFloat(list.style.minHeight);
        const visibleBottom = viewport - list.getBoundingClientRect().top;
        anchor = { selector, listSelector, top: rect.top, nativeHeight, requiredHeight: Math.min(nativeHeight, visibleBottom) };
      }
    }
    layouts.set(label, { state, posts });
  }
  if (!anchor) return;

  // Supply the last grid geometry before X measures its remounted cells.
  const sheet = new CSSStyleSheet();
  rules.unshift(`${anchor.listSelector}:has(> [data-testid="cellInnerDiv"]) { height: ${anchor.nativeHeight}px; }`);
  sheet.replaceSync(rules.join('\n'));
  document.adoptedStyleSheets.push(sheet);
  homeReturn = { anchor, layouts, sheet, key: navigation.currentEntry.key, scrollEnded: scrollY === 0, corrections: new Set() };
}

function reuseHomeLayout(list, cells) {
  if (!homeReturn || homeReturn.key !== navigation.currentEntry.key) return;
  const label = list.parentElement.getAttribute('aria-label');
  if (!homeReturn.layouts.has(label)) return;
  const { state, posts } = homeReturn.layouts.get(label);
  for (const cell of cells) {
    const link = cell.querySelector(statusLinkSelector);
    if (!link) continue;
    cell.style.setProperty('--multiplex-width', '25%');
    if (state.indices.has(cell)) continue;
    const href = link.getAttribute('href');
    if (!posts.has(href)) continue;
    const { index, part } = posts.get(href);
    if (!state.groups.has(index)) continue;
    state.indices.set(cell, index);
    state.parts.set(cell, part);
    lists.set(list, state);
  }
}

function restoreHomePosition() {
  if (!homeReturn || homeReturn.key !== navigation.currentEntry.key || !homeReturn.scrollEnded) return;
  const cell = document.querySelector(homeReturn.anchor.selector);
  if (!cell) return;
  // X initially mounts a short list before restoring its virtual scroll range.
  const nativeHeight = Number.parseFloat(cell.parentElement.style.minHeight);
  if (!(nativeHeight >= homeReturn.anchor.requiredHeight)) return;
  const article = cell.querySelector(statusLinkSelector).closest('article');
  const delta = article.getBoundingClientRect().top - homeReturn.anchor.top;
  if (Math.abs(delta) < 1) return;
  const current = Math.round(window.scrollY);
  const target = Math.max(0, Math.round(window.scrollY + delta));
  const correction = `${current}:${target}`;
  // An identical correction after X scrolls back would repeat the same cycle.
  if (current === target || homeReturn.corrections.has(correction)) return;
  homeReturn.corrections.add(correction);
  homeReturn.scrollEnded = false;
  window.scrollTo({ top: target, behavior: 'instant' });
}

function updateHomeLayout() {
  document.documentElement.classList.toggle('multiplex-home', location.pathname === '/home');
  if (homeReturn && location.pathname === '/home' && homeReturn.key !== navigation.currentEntry.key) clearHomeReturn();
  labelFeedbackButtons();
  scheduleLayout();
}

updateHomeLayout();
navigation.addEventListener('navigate', saveHomePosition);
navigation.addEventListener('navigatesuccess', updateHomeLayout);
document.addEventListener('scroll', () => {
  if (homeReturn && location.pathname === '/home' && homeReturn.key === navigation.currentEntry.key) homeReturn.scrollEnded = false;
}, { passive: true });
document.addEventListener('scrollend', () => {
  if (!homeReturn || location.pathname !== '/home' || homeReturn.key !== navigation.currentEntry.key) return;
  homeReturn.scrollEnded = true;
  scheduleLayout();
});
for (const event of ['wheel', 'pointerdown', 'touchmove', 'keydown']) {
  document.addEventListener(event, () => {
    if (location.pathname === '/home') clearHomeReturn();
  }, { passive: true, capture: true });
}
new MutationObserver(scheduleLayout).observe(document.documentElement, { childList: true, subtree: true });
