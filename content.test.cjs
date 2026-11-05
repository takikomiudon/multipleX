const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');

const location = { pathname: '/home' };
const listeners = new Map();
const classes = new Set();
runInNewContext(readFileSync('content.js', 'utf8'), {
  location,
  labelFeedbackButtons() {},
  ResizeObserver: class { observe() {} },
  MutationObserver: class { observe() {} },
  requestAnimationFrame() {},
  document: { addEventListener() {}, documentElement: { classList: {
    toggle(name, enabled) {
      if (enabled) classes.add(name);
      else classes.delete(name);
    },
  } } },
  navigation: { addEventListener: (event, callback) => listeners.set(event, callback) },
});
assert.ok(classes.has('multiplex-home'));
for (const pathname of ['/search', '/someone/status/123', '/home']) {
  location.pathname = pathname;
  listeners.get('navigatesuccess')();
  assert.equal(classes.has('multiplex-home'), pathname === '/home');
}
console.log('PASS: initial home and SPA navigation');
