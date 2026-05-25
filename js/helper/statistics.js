export function mean(arr) {
  return arr.length
    ? arr.reduce((a, b) => a + b, 0) / arr.length
    : 0;
}

export function median(arr) {

  if (!arr.length) return 0;

  const sorted =
    [...arr].sort((a, b) => a - b);

  const mid =
    Math.floor(sorted.length / 2);

  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function standardDeviation(arr) {

  if (arr.length < 2) return 0;

  const m = mean(arr);

  const variance =
    mean(arr.map(v => (v - m) ** 2));

  return Math.sqrt(variance);
}

export function correlation(x, y) {

  if (
    !x.length ||
    !y.length ||
    x.length !== y.length
  ) return 0;

  const meanX = mean(x);
  const meanY = mean(y);

  let numerator = 0;
  let dx2 = 0;
  let dy2 = 0;

  for (let i = 0; i < x.length; i++) {

    const dx = x[i] - meanX;
    const dy = y[i] - meanY;

    numerator += dx * dy;
    dx2 += dx ** 2;
    dy2 += dy ** 2;
  }

  const denominator =
    Math.sqrt(dx2 * dy2);

  return denominator === 0
    ? 0
    : numerator / denominator;
}