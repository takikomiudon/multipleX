function needsTopBorder(index, part, heights) {
  if (part > 0) return false;
  if (!heights.has(index - 4)) return true;
  // Compare in native slot units so quarter-height rounding is not a gap.
  return Math.ceil(heights.get(index - 4) / 4) < layoutSlot(index - 4, heights).height;
}

function layoutSlot(index, heights) {
  const column = ((index % 4) + 4) % 4;
  const start = index - column;
  let maximum = 0;
  for (let offset = 0; offset < 4; offset++) {
    if (heights.has(start + offset)) {
      maximum = Math.max(maximum, heights.get(start + offset));
    }
  }
  const height = Math.ceil(maximum / 4);
  return { column, height, offset: column * height };
}

function layoutDivider(index, height, heights) {
  const column = ((index % 4) + 4) % 4;
  let offset = 0;
  if (column > 0) offset = layoutSlot(index - 1, heights).height * (4 - column);
  return { height: height + offset, offset };
}

function layoutThreadSlot(index, part, members, heights) {
  const slot = layoutSlot(index, heights);
  const count = Math.max(...members.keys()) + 1;
  const nativeOffset = Math.floor(slot.height * part / count);
  const height = Math.floor(slot.height * (part + 1) / count) - nativeOffset;
  let contentOffset = 0;
  for (const [member, memberHeight] of members) {
    if (member < part) contentOffset += memberHeight;
  }
  return { column: slot.column, height, offset: slot.offset + nativeOffset - contentOffset };
}
