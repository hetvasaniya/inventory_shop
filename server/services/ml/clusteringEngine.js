/**
 * Product Segmentation — K-Means Clustering Engine
 * Groups products based on sales & inventory behavior, calculates WCSS (Inertia),
 * Silhouette Score, and derives semantic cluster interpretations from statistical centroids.
 */

// Feature index mapping:
// 0: totalSales, 1: avgSales, 2: revenue, 3: stock, 4: price, 5: frequency

function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  return Math.sqrt(sum);
}

function normalizeFeatures(data) {
  const numFeatures = data[0].rawFeatures.length;
  const means = new Array(numFeatures).fill(0);
  const stds = new Array(numFeatures).fill(1);

  for (let j = 0; j < numFeatures; j++) {
    const col = data.map((d) => d.rawFeatures[j]);
    const m = col.reduce((a, b) => a + b, 0) / col.length;
    const s = Math.sqrt(col.reduce((a, b) => a + Math.pow(b - m, 2), 0) / col.length) || 1;
    means[j] = m;
    stds[j] = s;
  }

  const normalized = data.map((d) => ({
    ...d,
    scaledFeatures: d.rawFeatures.map((val, j) => (val - means[j]) / stds[j]),
  }));

  return { normalized, means, stds };
}

/**
 * K-Means++ centroid initialization
 */
function initCentroidsKMeansPlusPlus(points, k) {
  const centroids = [];
  // Pick first centroid randomly
  const firstIdx = Math.floor(Math.random() * points.length);
  centroids.push([...points[firstIdx]]);

  while (centroids.length < k) {
    const distances = points.map((p) => {
      const minD = Math.min(...centroids.map((c) => euclideanDistance(p, c)));
      return minD * minD;
    });

    const sumD = distances.reduce((a, b) => a + b, 0);
    let rand = Math.random() * sumD;
    let chosenIdx = 0;

    for (let i = 0; i < distances.length; i++) {
      rand -= distances[i];
      if (rand <= 0) {
        chosenIdx = i;
        break;
      }
    }
    centroids.push([...points[chosenIdx]]);
  }

  return centroids;
}

/**
 * Run K-Means clustering algorithm
 */
function runKMeans(data, k = 3, maxIterations = 50) {
  if (data.length === 0) {
    return { clusters: [], inertia: 0, silhouetteScore: 0, elbowCurve: [] };
  }

  const effectiveK = Math.min(k, data.length);
  const { normalized, means: overallMeans, stds: overallStds } = normalizeFeatures(data);
  const points = normalized.map((d) => d.scaledFeatures);

  let centroids = initCentroidsKMeansPlusPlus(points, effectiveK);
  let assignments = new Array(points.length).fill(0);
  let converged = false;
  let iter = 0;

  while (!converged && iter < maxIterations) {
    iter++;
    let changed = false;

    // Assignment step
    for (let i = 0; i < points.length; i++) {
      let bestCluster = 0;
      let minDistance = Infinity;

      for (let c = 0; c < effectiveK; c++) {
        const d = euclideanDistance(points[i], centroids[c]);
        if (d < minDistance) {
          minDistance = d;
          bestCluster = c;
        }
      }

      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster;
        changed = true;
      }
    }

    if (!changed) {
      converged = true;
      break;
    }

    // Update step
    const numFeatures = points[0].length;
    const newCentroids = Array.from({ length: effectiveK }, () => new Array(numFeatures).fill(0));
    const counts = new Array(effectiveK).fill(0);

    for (let i = 0; i < points.length; i++) {
      const c = assignments[i];
      counts[c]++;
      for (let f = 0; f < numFeatures; f++) {
        newCentroids[c][f] += points[i][f];
      }
    }

    for (let c = 0; c < effectiveK; c++) {
      if (counts[c] > 0) {
        for (let f = 0; f < numFeatures; f++) {
          newCentroids[c][f] /= counts[c];
        }
        centroids[c] = newCentroids[c];
      }
    }
  }

  // Calculate WCSS / Inertia
  let inertia = 0;
  for (let i = 0; i < points.length; i++) {
    const c = assignments[i];
    inertia += Math.pow(euclideanDistance(points[i], centroids[c]), 2);
  }
  inertia = Number(inertia.toFixed(2));

  // Calculate Silhouette Score
  const silhouetteScore = calculateSilhouetteScore(points, assignments, effectiveK);

  // Group products into clusters
  const clusters = [];
  for (let c = 0; c < effectiveK; c++) {
    const clusterProducts = [];
    for (let i = 0; i < points.length; i++) {
      if (assignments[i] === c) {
        clusterProducts.push({
          ...normalized[i],
          clusterId: c,
        });
      }
    }

    // Unscale centroid to real values
    const rawCentroid = centroids[c].map((scaledVal, j) =>
      Number((scaledVal * overallStds[j] + overallMeans[j]).toFixed(2))
    );

    clusters.push({
      clusterId: c,
      size: clusterProducts.length,
      percentage: Number(((clusterProducts.length / points.length) * 100).toFixed(1)),
      centroidScaled: centroids[c].map((v) => Number(v.toFixed(3))),
      centroidMetrics: {
        totalSales: rawCentroid[0],
        avgDailySales: rawCentroid[1],
        revenue: rawCentroid[2],
        stock: rawCentroid[3],
        price: rawCentroid[4],
        frequency: rawCentroid[5],
      },
      products: clusterProducts,
    });
  }

  // Derive semantic cluster labels from actual centroid statistics
  profileClusters(clusters, overallMeans);

  // Calculate Elbow curve for K=2 to K=min(7, data.length)
  const elbowCurve = [];
  const maxK = Math.min(7, data.length);
  for (let testK = 2; testK <= maxK; testK++) {
    const testRes = runQuickKMeansInertia(points, testK);
    elbowCurve.push({
      k: testK,
      inertia: testRes.inertia,
      silhouette: testRes.silhouette,
    });
  }

  return {
    k: effectiveK,
    inertia,
    silhouetteScore,
    clusters,
    elbowCurve,
  };
}

/**
 * Fast K-Means for Elbow Curve
 */
function runQuickKMeansInertia(points, k) {
  let centroids = initCentroidsKMeansPlusPlus(points, k);
  let assignments = new Array(points.length).fill(0);

  for (let iter = 0; iter < 15; iter++) {
    for (let i = 0; i < points.length; i++) {
      let best = 0;
      let minD = Infinity;
      for (let c = 0; c < k; c++) {
        const d = euclideanDistance(points[i], centroids[c]);
        if (d < minD) {
          minD = d;
          best = c;
        }
      }
      assignments[i] = best;
    }

    const newCentroids = Array.from({ length: k }, () => new Array(points[0].length).fill(0));
    const counts = new Array(k).fill(0);

    for (let i = 0; i < points.length; i++) {
      const c = assignments[i];
      counts[c]++;
      for (let f = 0; f < points[0].length; f++) {
        newCentroids[c][f] += points[i][f];
      }
    }

    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        for (let f = 0; f < points[0].length; f++) {
          newCentroids[c][f] /= counts[c];
        }
        centroids[c] = newCentroids[c];
      }
    }
  }

  let inertia = 0;
  for (let i = 0; i < points.length; i++) {
    inertia += Math.pow(euclideanDistance(points[i], centroids[assignments[i]]), 2);
  }

  const silhouette = calculateSilhouetteScore(points, assignments, k);
  return { inertia: Number(inertia.toFixed(2)), silhouette };
}

/**
 * Silhouette Coefficient calculation
 * s(i) = (b(i) - a(i)) / max(a(i), b(i))
 */
function calculateSilhouetteScore(points, assignments, k) {
  if (k <= 1 || points.length <= k) return 0;
  const n = points.length;
  let totalSilhouette = 0;

  for (let i = 0; i < n; i++) {
    const clusterI = assignments[i];
    let aSum = 0;
    let aCount = 0;

    // Other clusters dist
    const bSums = new Array(k).fill(0);
    const bCounts = new Array(k).fill(0);

    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const dist = euclideanDistance(points[i], points[j]);
      if (assignments[j] === clusterI) {
        aSum += dist;
        aCount++;
      } else {
        bSums[assignments[j]] += dist;
        bCounts[assignments[j]]++;
      }
    }

    const a_i = aCount > 0 ? aSum / aCount : 0;

    let b_i = Infinity;
    for (let c = 0; c < k; c++) {
      if (c !== clusterI && bCounts[c] > 0) {
        const avgDist = bSums[c] / bCounts[c];
        if (avgDist < b_i) b_i = avgDist;
      }
    }
    if (b_i === Infinity) b_i = 0;

    const max_ab = Math.max(a_i, b_i);
    const s_i = max_ab > 0 ? (b_i - a_i) / max_ab : 0;
    totalSilhouette += s_i;
  }

  return Number((totalSilhouette / n).toFixed(3));
}

/**
 * Determine cluster semantics from statistical properties
 * Features: [totalSales, avgSales, revenue, stock, price, frequency]
 */
function profileClusters(clusters, overallMeans) {
  const avgSalesOverall = overallMeans[0];
  const avgRevOverall = overallMeans[2];
  const avgStockOverall = overallMeans[3];
  const avgPriceOverall = overallMeans[4];

  clusters.forEach((cl, idx) => {
    const m = cl.centroidMetrics;
    const isHighSales = m.totalSales >= avgSalesOverall;
    const isHighRev = m.revenue >= avgRevOverall;
    const isHighStock = m.stock >= avgStockOverall;
    const isHighPrice = m.price >= avgPriceOverall;

    let label = `Cluster ${idx + 1}`;
    let category = 'Standard Catalog';
    let strategy = 'Maintain standard reorder policy';
    let tagColor = 'primary';

    if (isHighSales && isHighRev) {
      label = 'High-Velocity Revenue Stars';
      category = 'Top Performers';
      strategy = 'Ensure zero stockouts, establish supplier priority contracts, and protect buffer stock.';
      tagColor = 'success';
    } else if (!isHighSales && isHighStock && !isHighRev) {
      label = 'Overstocked / Slow-Moving Capital';
      category = 'Inventory Risk';
      strategy = 'Hold reorders, consider bundling, discounts, or promotional campaigns to liquidate cash.';
      tagColor = 'error';
    } else if (isHighPrice && !isHighSales && isHighRev) {
      label = 'High-Margin Premium Goods';
      category = 'Margin Drivers';
      strategy = 'Keep lean stock to reduce holding costs; target upsell at point of sale.';
      tagColor = 'secondary';
    } else if (!isHighSales && !isHighRev && !isHighStock) {
      label = 'Low-Demand / Long-Tail Items';
      category = 'Long Tail';
      strategy = 'Order on demand (Just-In-Time) or review product viability for catalog trimming.';
      tagColor = 'default';
    } else {
      label = 'Steady Core Inventory';
      category = 'Consistent Volume';
      strategy = 'Automate periodic restocks aligned with regular lead times.';
      tagColor = 'info';
    }

    cl.profile = {
      name: label,
      category,
      strategy,
      tagColor,
      characteristics: [
        `Average Units Sold: ${m.totalSales}`,
        `Average Revenue: ₹${m.revenue}`,
        `Average Stock Level: ${m.stock} units`,
        `Average Price: ₹${m.price}`,
      ],
    };
  });
}

module.exports = {
  runKMeans,
  normalizeFeatures,
  calculateSilhouetteScore,
};
