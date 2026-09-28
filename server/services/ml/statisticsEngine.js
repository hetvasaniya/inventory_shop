/**
 * Statistical Analysis Engine
 * Computes descriptive statistics, distributions, histograms, and box plots.
 */

function calculateMean(arr) {
  if (!arr || arr.length === 0) return 0;
  const sum = arr.reduce((acc, val) => acc + val, 0);
  return Number((sum / arr.length).toFixed(2));
}

function calculateMedian(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Number(median.toFixed(2));
}

function calculateVariance(arr, meanVal = null) {
  if (!arr || arr.length <= 1) return 0;
  const mean = meanVal !== null ? meanVal : calculateMean(arr);
  const squareDiffs = arr.map((val) => Math.pow(val - mean, 2));
  const variance = squareDiffs.reduce((acc, val) => acc + val, 0) / (arr.length - 1);
  return Number(variance.toFixed(2));
}

function calculateStdDev(arr, varianceVal = null) {
  if (!arr || arr.length <= 1) return 0;
  const variance = varianceVal !== null ? varianceVal : calculateVariance(arr);
  return Number(Math.sqrt(variance).toFixed(2));
}

function calculatePercentile(sortedArr, percentile) {
  if (!sortedArr || sortedArr.length === 0) return 0;
  const index = (percentile / 100) * (sortedArr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  if (lower === upper) return sortedArr[lower];
  return sortedArr[lower] * (1 - weight) + sortedArr[upper] * weight;
}

function calculateQuartiles(arr) {
  if (!arr || arr.length === 0) {
    return { q1: 0, q2: 0, q3: 0, iqr: 0, lowerFence: 0, upperFence: 0, outliers: [] };
  }
  const sorted = [...arr].sort((a, b) => a - b);
  const q1 = Number(calculatePercentile(sorted, 25).toFixed(2));
  const q2 = Number(calculatePercentile(sorted, 50).toFixed(2));
  const q3 = Number(calculatePercentile(sorted, 75).toFixed(2));
  const iqr = Number((q3 - q1).toFixed(2));
  const lowerFence = Number((q1 - 1.5 * iqr).toFixed(2));
  const upperFence = Number((q3 + 1.5 * iqr).toFixed(2));

  const outliers = sorted.filter((v) => v < lowerFence || v > upperFence);

  return { q1, q2, q3, iqr, lowerFence, upperFence, outliers };
}

function calculateHistogram(arr, binCount = 8) {
  if (!arr || arr.length === 0) return [];
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  if (min === max) {
    return [{ range: `${min}`, binStart: min, binEnd: max, count: arr.length, density: 1.0 }];
  }

  const binWidth = (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => {
    const start = min + i * binWidth;
    const end = start + binWidth;
    return {
      binStart: Number(start.toFixed(1)),
      binEnd: Number(end.toFixed(1)),
      range: `${start.toFixed(1)} - ${end.toFixed(1)}`,
      count: 0,
      density: 0,
    };
  });

  arr.forEach((val) => {
    let binIdx = Math.floor((val - min) / binWidth);
    if (binIdx >= binCount) binIdx = binCount - 1;
    if (binIdx < 0) binIdx = 0;
    bins[binIdx].count++;
  });

  const total = arr.length;
  bins.forEach((b) => {
    b.density = Number((b.count / total).toFixed(4));
  });

  return bins;
}

function analyzeNumericalArray(arr, label = 'Variable') {
  if (!arr || arr.length === 0) {
    return {
      label,
      count: 0,
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      stdDev: 0,
      variance: 0,
      quartiles: { q1: 0, q2: 0, q3: 0, iqr: 0, lowerFence: 0, upperFence: 0, outliers: [] },
      histogram: [],
    };
  }

  const sorted = [...arr].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = calculateMean(sorted);
  const median = calculateMedian(sorted);
  const variance = calculateVariance(sorted, mean);
  const stdDev = calculateStdDev(sorted, variance);
  const quartiles = calculateQuartiles(sorted);
  const histogram = calculateHistogram(sorted, Math.min(10, Math.max(5, Math.ceil(Math.sqrt(sorted.length)))));

  return {
    label,
    count: sorted.length,
    mean,
    median,
    min,
    max,
    stdDev,
    variance,
    quartiles,
    histogram,
  };
}

module.exports = {
  calculateMean,
  calculateMedian,
  calculateVariance,
  calculateStdDev,
  calculatePercentile,
  calculateQuartiles,
  calculateHistogram,
  analyzeNumericalArray,
};
