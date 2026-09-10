const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const frames = new Map();
const events = new Map();
let clock = 0;
let nextFrame = 0;
let position = 0;
let receive;
const location = { pathname: '/home' };
const document = { hidden: false, addEventListener: (name, fn) => events.set(name, fn) };
runInNewContext(readFileSync('autoscroll.js', 'utf8'), {
  location, document,
  performance: { now: () => clock },
  requestAnimationFrame: fn => { frames.set(++nextFrame, fn); return nextFrame; },
  cancelAnimationFrame: id => frames.delete(id),
  window: { scrollBy: ({ top }) => { position += top; } },
  navigation: { addEventListener: (name, fn) => events.set(name, fn) },
  chrome: { runtime: { onMessage: { addListener: fn => { receive = fn; } } } },
});
function message(value) {
  let result;
  receive(value, {}, response => { result = response; });
  return result;
}
function tick(ms) {
  clock += ms;
  const pending = [...frames.values()];
  frames.clear();
  for (const fn of pending) fn(clock);
}
assert.equal(message({ type: 'multiplex-scroll:get' }).running, false);
message({ type: 'multiplex-scroll:set', speed: 60, running: true });
for (let i = 0; i < 60; i++) tick(1000 / 60);
assert.ok(Math.abs(position - 60) <= 1, '60px/秒で動く');
message({ type: 'multiplex-scroll:set', speed: 120, running: true });
assert.equal(frames.size, 1, '速度変更でループを増やさない');
const beforeSpeed = position;
tick(1000);
assert.equal(position - beforeSpeed, 120);
document.hidden = true;
events.get('visibilitychange')();
tick(10000);
document.hidden = false;
events.get('visibilitychange')();
const beforeResume = position;
tick(1000);
assert.equal(position - beforeResume, 120, '非表示中の時間を加算しない');
message({ type: 'multiplex-scroll:set', speed: 120, running: false });
const stopped = position;
tick(1000);
assert.equal(position, stopped);
message({ type: 'multiplex-scroll:set', speed: 10, running: true });
for (let i = 0; i < 60; i++) tick(1000 / 60);
assert.ok(Math.abs(position - stopped - 10) <= 1, '低速でも端数が蓄積される');
assert.ok(message({ type: 'multiplex-scroll:set', speed: -1, running: true }).error);
location.pathname = '/search';
events.get('navigatesuccess')();
assert.equal(frames.size, 0);
assert.ok(message({ type: 'multiplex-scroll:set', speed: 60, running: true }).error);
console.log('PASS: scroll speed, stop, low speed, visibility, navigation and validation');
