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
