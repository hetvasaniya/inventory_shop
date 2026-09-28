/**
 * Demand Forecasting — Regression ML Models
 * Implements Linear Regression, Random Forest Regressor, and Gradient Boosted Regressor.
 */

// --- Evaluation Metrics ---

function evaluateRegression(yTrue, yPred) {
  const n = yTrue.length;
  if (n === 0) return { mae: 0, mse: 0, rmse: 0, r2: 0 };

  let sumAbsErr = 0;
  let sumSqErr = 0;
  let sumY = 0;

  for (let i = 0; i < n; i++) {
    const err = yTrue[i] - yPred[i];
    sumAbsErr += Math.abs(err);
    sumSqErr += err * err;
    sumY += yTrue[i];
  }

  const meanY = sumY / n;
  let totalSumSq = 0;
  for (let i = 0; i < n; i++) {
    totalSumSq += Math.pow(yTrue[i] - meanY, 2);
  }

  const mae = Number((sumAbsErr / n).toFixed(3));
  const mse = Number((sumSqErr / n).toFixed(3));
  const rmse = Number((Math.sqrt(mse)).toFixed(3));
  const r2 = totalSumSq > 0 ? Number(Math.max(-1, 1 - sumSqErr / totalSumSq).toFixed(3)) : 0;

  return { mae, mse, rmse, r2 };
}

// --- Linear Regression (Multiple OLS with Gradient Descent / Normal Equation) ---

class LinearRegressionModel {
  constructor(learningRate = 0.01, iterations = 500) {
    this.lr = learningRate;
    this.iterations = iterations;
    this.weights = [];
    this.bias = 0;
    this.means = [];
    this.stds = [];
  }

  _normalize(X, isTraining = true) {
    const numFeatures = X[0].length;
    if (isTraining) {
      this.means = new Array(numFeatures).fill(0);
      this.stds = new Array(numFeatures).fill(1);

      for (let j = 0; j < numFeatures; j++) {
        const col = X.map((row) => row[j]);
        const m = col.reduce((a, b) => a + b, 0) / col.length;
        const variance = col.reduce((a, b) => a + Math.pow(b - m, 2), 0) / col.length;
        const s = Math.sqrt(variance) || 1;
        this.means[j] = m;
        this.stds[j] = s;
      }
    }

    return X.map((row) =>
      row.map((val, j) => (val - this.means[j]) / this.stds[j])
    );
  }

  fit(X, y) {
    if (X.length === 0) return;
    const numSamples = X.length;
    const numFeatures = X[0].length;
    const XNorm = this._normalize(X, true);

    this.weights = new Array(numFeatures).fill(0);
    this.bias = y.reduce((a, b) => a + b, 0) / numSamples;

    // Gradient Descent with momentum
    for (let iter = 0; iter < this.iterations; iter++) {
      const gradW = new Array(numFeatures).fill(0);
      let gradB = 0;

      for (let i = 0; i < numSamples; i++) {
        let pred = this.bias;
        for (let j = 0; j < numFeatures; j++) {
          pred += this.weights[j] * XNorm[i][j];
        }
        const error = pred - y[i];
        for (let j = 0; j < numFeatures; j++) {
          gradW[j] += error * XNorm[i][j];
        }
        gradB += error;
      }

      for (let j = 0; j < numFeatures; j++) {
        this.weights[j] -= (this.lr * gradW[j]) / numSamples;
      }
      this.bias -= (this.lr * gradB) / numSamples;
    }
  }

  predict(X) {
    const XNorm = this._normalize(X, false);
    return XNorm.map((row) => {
      let pred = this.bias;
      for (let j = 0; j < row.length; j++) {
        pred += (this.weights[j] || 0) * row[j];
      }
      return Math.max(0, Number(pred.toFixed(2)));
    });
  }
}

// --- Decision Tree Regressor ---

class DecisionTreeNode {
  constructor(feature = null, threshold = null, left = null, right = null, value = null) {
    this.feature = feature;
    this.threshold = threshold;
    this.left = left;
    this.right = right;
    this.value = value;
  }
}

class DecisionTreeRegressor {
  constructor(maxDepth = 5, minSamplesSplit = 4) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.root = null;
  }

  fit(X, y) {
    this.root = this._buildTree(X, y, 0);
  }

  _variance(y) {
    if (y.length <= 1) return 0;
    const mean = y.reduce((a, b) => a + b, 0) / y.length;
    return y.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / y.length;
  }

  _buildTree(X, y, depth) {
    const numSamples = X.length;
    const numFeatures = X[0]?.length || 0;
    const meanVal = y.length > 0 ? y.reduce((a, b) => a + b, 0) / y.length : 0;

    if (depth >= this.maxDepth || numSamples < this.minSamplesSplit || numFeatures === 0) {
      return new DecisionTreeNode(null, null, null, null, meanVal);
    }

    let bestFeature = null;
    let bestThreshold = null;
    let bestVarianceReduction = -Infinity;
    const currentVariance = this._variance(y);

    for (let f = 0; f < numFeatures; f++) {
      const values = X.map((row) => row[f]);
      // Sample unique thresholds
      const uniqueVals = Array.from(new Set(values)).sort((a, b) => a - b);
      const step = Math.max(1, Math.floor(uniqueVals.length / 10));

      for (let i = 0; i < uniqueVals.length - 1; i += step) {
        const threshold = (uniqueVals[i] + uniqueVals[i + 1]) / 2;

        const leftY = [];
        const rightY = [];
        for (let idx = 0; idx < numSamples; idx++) {
          if (X[idx][f] <= threshold) leftY.push(y[idx]);
          else rightY.push(y[idx]);
        }

        if (leftY.length === 0 || rightY.length === 0) continue;

        const leftVar = this._variance(leftY);
        const rightVar = this._variance(rightY);
        const weightedVar = (leftY.length / numSamples) * leftVar + (rightY.length / numSamples) * rightVar;
        const varReduction = currentVariance - weightedVar;

        if (varReduction > bestVarianceReduction) {
          bestVarianceReduction = varReduction;
          bestFeature = f;
          bestThreshold = threshold;
        }
      }
    }

    if (bestVarianceReduction <= 0 || bestFeature === null) {
      return new DecisionTreeNode(null, null, null, null, meanVal);
    }

    const leftX = [], leftY = [], rightX = [], rightY = [];
    for (let i = 0; i < numSamples; i++) {
      if (X[i][bestFeature] <= bestThreshold) {
        leftX.push(X[i]);
        leftY.push(y[i]);
      } else {
        rightX.push(X[i]);
        rightY.push(y[i]);
      }
    }

    const leftNode = this._buildTree(leftX, leftY, depth + 1);
    const rightNode = this._buildTree(rightX, rightY, depth + 1);

    return new DecisionTreeNode(bestFeature, bestThreshold, leftNode, rightNode, meanVal);
  }

  predict(X) {
    return X.map((row) => this._traverse(this.root, row));
  }

  _traverse(node, row) {
    if (!node) return 0;
    if (node.feature === null || node.threshold === null) {
      return node.value;
    }
    if (row[node.feature] <= node.threshold) {
      return this._traverse(node.left, row);
    } else {
      return this._traverse(node.right, row);
    }
  }
}

// --- Random Forest Regressor ---

class RandomForestRegressorModel {
  constructor(numTrees = 15, maxDepth = 6, sampleRatio = 0.8) {
    this.numTrees = numTrees;
    this.maxDepth = maxDepth;
    this.sampleRatio = sampleRatio;
    this.trees = [];
  }

  fit(X, y) {
    this.trees = [];
    const n = X.length;
    const sampleSize = Math.max(2, Math.floor(n * this.sampleRatio));

    for (let t = 0; t < this.numTrees; t++) {
      // Bootstrap sampling with replacement
      const sampleX = [];
      const sampleY = [];
      for (let i = 0; i < sampleSize; i++) {
        const idx = Math.floor(Math.random() * n);
        sampleX.push(X[idx]);
        sampleY.push(y[idx]);
      }

      const tree = new DecisionTreeRegressor(this.maxDepth, 3);
      tree.fit(sampleX, sampleY);
      this.trees.push(tree);
    }
  }

  predict(X) {
    if (this.trees.length === 0) return X.map(() => 0);
    const allPredictions = this.trees.map((t) => t.predict(X));
    const finalPreds = [];

    for (let i = 0; i < X.length; i++) {
      let sum = 0;
      for (let t = 0; t < this.trees.length; t++) {
        sum += allPredictions[t][i];
      }
      finalPreds.push(Math.max(0, Number((sum / this.trees.length).toFixed(2))));
    }

    return finalPreds;
  }
}

// --- Gradient Boosted Regressor ---

class GradientBoostRegressorModel {
  constructor(numEstimators = 12, learningRate = 0.1, maxDepth = 3) {
    this.numEstimators = numEstimators;
    this.learningRate = learningRate;
    this.maxDepth = maxDepth;
    this.initPrediction = 0;
    this.trees = [];
  }

  fit(X, y) {
    const n = X.length;
    if (n === 0) return;

    this.initPrediction = y.reduce((a, b) => a + b, 0) / n;
    let currentPreds = new Array(n).fill(this.initPrediction);
    this.trees = [];

    for (let m = 0; m < this.numEstimators; m++) {
      // Compute negative gradients (residuals for squared loss)
      const residuals = [];
      for (let i = 0; i < n; i++) {
        residuals.push(y[i] - currentPreds[i]);
      }

      const tree = new DecisionTreeRegressor(this.maxDepth, 3);
      tree.fit(X, residuals);

      const treePreds = tree.predict(X);
      for (let i = 0; i < n; i++) {
        currentPreds[i] += this.learningRate * treePreds[i];
      }

      this.trees.push(tree);
    }
  }

  predict(X) {
    const n = X.length;
    let preds = new Array(n).fill(this.initPrediction);

    for (const tree of this.trees) {
      const treePreds = tree.predict(X);
      for (let i = 0; i < n; i++) {
        preds[i] += this.learningRate * treePreds[i];
      }
    }

    return preds.map((p) => Math.max(0, Number(p.toFixed(2))));
  }
}

// --- Model Training & Comparison Runner ---

function trainAndCompareRegression(trainData, testData) {
  const XTrain = trainData.map((d) => d.features);
  const yTrain = trainData.map((d) => d.target);

  const XTest = testData.map((d) => d.features);
  const yTest = testData.map((d) => d.target);

  // 1. Linear Regression
  const lr = new LinearRegressionModel(0.02, 600);
  lr.fit(XTrain, yTrain);
  const lrPreds = lr.predict(XTest);
  const lrMetrics = evaluateRegression(yTest, lrPreds);

  // 2. Random Forest Regressor
  const rf = new RandomForestRegressorModel(16, 5, 0.85);
  rf.fit(XTrain, yTrain);
  const rfPreds = rf.predict(XTest);
  const rfMetrics = evaluateRegression(yTest, rfPreds);

  // 3. Gradient Boosted Regressor
  const gb = new GradientBoostRegressorModel(15, 0.12, 4);
  gb.fit(XTrain, yTrain);
  const gbPreds = gb.predict(XTest);
  const gbMetrics = evaluateRegression(yTest, gbPreds);

  return {
    models: {
      linearRegression: {
        name: 'Linear Regression',
        type: 'Linear / Analytical',
        model: lr,
        metrics: lrMetrics,
      },
      randomForest: {
        name: 'Random Forest Regressor',
        type: 'Ensemble (Bagging)',
        model: rf,
        metrics: rfMetrics,
      },
      gradientBoost: {
        name: 'Gradient Boosted Regressor (XGBoost Equivalent)',
        type: 'Ensemble (Boosting)',
        model: gb,
        metrics: gbMetrics,
      },
    },
    sampleCount: {
      train: trainData.length,
      test: testData.length,
    },
  };
}

module.exports = {
  evaluateRegression,
  LinearRegressionModel,
  RandomForestRegressorModel,
  GradientBoostRegressorModel,
  trainAndCompareRegression,
};
