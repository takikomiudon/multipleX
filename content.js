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
    let start = 0;
    for (let index = 0; index < cells.length; index++) {
      if (state.indices.has(cells[index])) {
        start = state.indices.get(cells[index]) - index;
        break;
      }
    }
    for (let index = 0; index < cells.length; index++) {
      const cell = cells[index];
      state.indices.set(cell, start + index);
      for (const child of cell.children) {
        if (!observed.has(child)) {
          resizeObserver.observe(child);
          observed.add(child);
        }
      }
      const height = [...cell.children].reduce((sum, child) => sum + child.getBoundingClientRect().height, 0);
      state.heights.set(start + index, height);
    }
    for (const cell of cells) {
      const slot = layoutSlot(state.indices.get(cell), state.heights);
      cell.style.setProperty('--multiplex-left', `${slot.column * 25}%`);
      cell.style.setProperty('--multiplex-height', `${slot.height}px`);
      cell.style.setProperty('--multiplex-offset', `${-slot.offset}px`);
    }
  }
}

function updateHomeLayout() {
  document.documentElement.classList.toggle('multiplex-home', location.pathname === '/home');
  scheduleLayout();
}

updateHomeLayout();
navigation.addEventListener('navigatesuccess', updateHomeLayout);
new MutationObserver(scheduleLayout).observe(document.documentElement, { childList: true, subtree: true });
