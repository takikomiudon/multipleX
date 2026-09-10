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
    if (!lists.has(list)) lists.set(list, { indices: new WeakMap(), parts: new WeakMap(), groups: new Map(), heights: new Map() });
    const state = lists.get(list);
    const cells = [...list.children].filter(cell => cell.dataset.testid === 'cellInnerDiv');
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
