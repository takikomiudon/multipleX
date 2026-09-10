const lists = new WeakMap();
const observed = new Set();
let scheduled = false;
const resizeObserver = new ResizeObserver(scheduleLayout);

function scheduleLayout() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    if (location.pathname !== '/home') return;
    layoutTimelines();
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
  const selector = '[data-testid="primaryColumn"] section [aria-label] > div:has(> [data-testid="cellInnerDiv"])';
  for (const list of document.querySelectorAll(selector)) {
    if (!lists.has(list)) lists.set(list, { indices: new WeakMap(), heights: new Map() });
    const state = lists.get(list);
    const cells = [...list.children].filter(cell => cell.dataset.testid === 'cellInnerDiv');
    const entries = cells.map(cell => ({
      cell,
      fullWidth: cell.querySelectorAll('[data-testid="tweet"]').length === 0,
      height: [...cell.children].reduce((sum, child) => sum + child.getBoundingClientRect().height, 0),
      index: 0,
    }));
    let start = 0;
    let anchored = false;
    for (let index = 0; index < entries.length; index++) {
      if (state.indices.has(entries[index].cell)) {
        anchored = true;
        start = state.indices.get(entries[index].cell);
        for (let previous = index - 1; previous >= 0; previous--) {
          if (entries[previous].fullWidth) start = Math.floor(start / 4) * 4 - 4;
          else start--;
        }
        break;
      }
    }
    if (!anchored) state.heights.clear();
    for (const { cell } of entries) {
      if (state.indices.has(cell)) state.heights.delete(state.indices.get(cell));
    }
    for (const entry of entries) {
      const { cell } = entry;
      entry.index = start;
      if (entry.fullWidth) {
        state.indices.delete(cell);
        start = Math.ceil(start / 4) * 4 + 4;
      } else {
        state.indices.set(cell, start);
        state.heights.set(start, entry.height);
        start++;
      }
      for (const child of cell.children) {
        if (!observed.has(child)) {
          resizeObserver.observe(child);
          observed.add(child);
        }
      }
    }
    for (const { cell, index, height, fullWidth } of entries) {
      if (fullWidth) {
        const divider = layoutDivider(index, height, state.heights);
        cell.style.setProperty('--multiplex-width', '100%');
        cell.style.setProperty('--multiplex-left', '0%');
        cell.style.setProperty('--multiplex-height', `${divider.height}px`);
        cell.style.setProperty('--multiplex-offset', `${divider.offset}px`);
        continue;
      }
      const slot = layoutSlot(index, state.heights);
      cell.style.setProperty('--multiplex-width', '25%');
      cell.style.setProperty('--multiplex-left', `${slot.column * 25}%`);
      cell.style.setProperty('--multiplex-height', `${slot.height}px`);
      cell.style.setProperty('--multiplex-offset', `${-slot.offset}px`);
    }
  }
}

function updateHomeLayout() {
  document.documentElement.classList.toggle('multiplex-home', location.pathname === '/home');
  labelFeedbackButtons();
  scheduleLayout();
}

updateHomeLayout();
navigation.addEventListener('navigatesuccess', updateHomeLayout);
new MutationObserver(scheduleLayout).observe(document.documentElement, { childList: true, subtree: true });
