const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const context = {};
runInNewContext(readFileSync('layout.js', 'utf8'), context);
const heights = new Map([[0, 101], [1, 350], [2, 160], [3, 240], [4, 203], [5, 81]]);
let nativeTop = 0;
const positions = [];
for (let index = 0; index < 6; index++) {
  const slot = context.layoutSlot(index, heights);
  positions.push(nativeTop - slot.offset);
  nativeTop += slot.height;
}
assert.deepEqual(positions, [0, 0, 0, 0, 352, 352]);
assert.equal(context.layoutSlot(2, heights).height, 88, '上の投稿がDOMから消えても行の高さを維持する');
assert.equal(context.layoutSlot(-1, new Map([[-1, 200]])).column, 3, '先頭への挿入も列番号を維持する');
heights.set(1, 701);
assert.equal(context.layoutSlot(0, heights).height, 176, '画像などの高さ変更を反映する');
console.log('PASS: native offsets, partial rows, prepending and resizing');
