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
assert.equal(context.layoutDivider(0, 49, heights).height, 49, '先頭の通知は1行分の実寸');
assert.equal(context.layoutDivider(2, 49, heights).offset, 352, '途中の通知は前の行の残りを空ける');
assert.equal(context.layoutDivider(2, 49, heights).height, 401);
console.log('PASS: native offsets, partial rows, prepending and resizing');

const threadHeights = new Map([[0, 240], [1, 160], [2, 200]]);
const groupedHeights = new Map([[0, 100], [1, 600], [2, 300], [3, 200]]);
let threadTop = 150;
const threadPositions = [];
for (let part = 0; part < 3; part++) {
  const slot = context.layoutThreadSlot(1, part, threadHeights, groupedHeights);
  assert.equal(slot.column, 1);
  threadPositions.push(threadTop - slot.offset);
  threadTop += slot.height;
}
assert.deepEqual(threadPositions, [0, 240, 400], '親と複数のリプライが同じ列で縦につながる');
assert.equal(threadTop, 300, 'スレッド全体で1列分のスクロール枠を使う');
assert.equal(context.layoutThreadSlot(1, 2, threadHeights, groupedHeights).offset, -150, '親がDOMから消えても返信の位置計算を維持する');
console.log('PASS: vertical thread layout and native slot heights');
