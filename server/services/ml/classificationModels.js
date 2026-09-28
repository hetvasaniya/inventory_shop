/**
 * Stock Risk Prediction — Classification ML Models
 * Implements Multinomial Logistic Regression and Random Forest Classifier for 3-class risk prediction:
 * Class 0: Low Risk
 * Class 1: Medium Risk
 * Class 2: High Risk
 */

const CLASS_NAMES = ['Low Risk', 'Medium Risk', 'High Risk'];

// --- Evaluation Metrics for Multi-Class Classification ---

function evaluateClassification(yTrue, yPred, numClasses = 3) {
  const n = yTrue.length;
  if (n === 0) {
    return {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      confusionMatrix: [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      classNames: CLASS_NAMES,
    };
  }

  // 3x3 Confusion Matrix [actual][predicted]
  const matrix = Array.from({ length: numClasses }, () => new Array(numClasses).fill(0));
  let correct = 0;

  for (let i = 0; i < n; i++) {
    const actual = yTrue[i];
    const predicted = yPred[i];
    if (actual >= 0 && actual < numClasses && predicted >= 0 && predicted < numClasses) {
      matrix[actual][predicted]++;
      if (actual === predicted) correct++;
    }
  }

  const accuracy = Number((correct / n).toFixed(3));

  // Compute per-class Precision, Recall, F1 and weighted average
  let totalPrecision = 0;
  let totalRecall = 0;
  let totalF1 = 0;
  let validClasses = 0;

  const perClass = [];

  for (let c = 0; c < numClasses; c++) {
    const tp = matrix[c][c];
    let fn = 0;
    for (let p = 0; p < numClasses; p++) {
      if (p !== c) fn += matrix[c][p];
    }
    let fp = 0;
    for (let a = 0; a < numClasses; a++) {
      if (a !== c) fp += matrix[a][c];
    }

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    perClass.push({
      class: CLASS_NAMES[c],
      precision: Number(precision.toFixed(3)),
      recall: Number(recall.toFixed(3)),
      f1: Number(f1.toFixed(3)),
      support: tp + fn,
    });

    totalPrecision += precision;
    totalRecall += recall;
    totalF1 += f1;
    validClasses++;
  }

  const macroPrecision = validClasses > 0 ? Number((totalPrecision / validClasses).toFixed(3)) : 0;
  const macroRecall = validClasses > 0 ? Number((totalRecall / validClasses).toFixed(3)) : 0;
  const macroF1 = validClasses > 0 ? Number((totalF1 / validClasses).toFixed(3)) : 0;

  return {
    accuracy,
    precision: macroPrecision,
    recall: macroRecall,
    f1Score: macroF1,
    confusionMatrix: matrix,
    classNames: CLASS_NAMES,
    perClass,
  };
}

// --- Multinomial Logistic Regression (Softmax) ---

class LogisticRegressionClassifierModel {
  constructor(learningRate = 0.05, iterations = 400, numClasses = 3) {
    this.lr = learningRate;
    this.iterations = iterations;
    this.numClasses = numClasses;
    this.weights = []; // [numClasses][numFeatures]
    this.biases = [];
    this.means = [];
    this.stds = [];
  }

  _normalize(X, isTraining = true) {
    const numFeatures = X[0].length;
    if (isTraining) {
      this.means = new Array(numFeatures).fill(0);
      this.stds = new Array(numFeatures).fill(1);
      for (let j = 0; j < numFeatures; j++) {
        const col = X.map((r) => r[j]);
        const m = col.reduce((a, b) => a + b, 0) / col.length;
        const s = Math.sqrt(col.reduce((a, b) => a + Math.pow(b - m, 2), 0) / col.length) || 1;
        this.means[j] = m;
        this.stds[j] = s;
      }
    }
    return X.map((r) => r.map((val, j) => (val - this.means[j]) / this.stds[j]));
  }

  _softmax(logits) {
    const maxVal = Math.max(...logits);
    const exp = logits.map((z) => Math.exp(z - maxVal));
    const sumExp = exp.reduce((a, b) => a + b, 0);
    return exp.map((e) => e / (sumExp || 1));
  }

  fit(X, y) {
    if (X.length === 0) return;
    const numSamples = X.length;
    const numFeatures = X[0].length;
    const XNorm = this._normalize(X, true);

    this.weights = Array.from({ length: this.numClasses }, () => new Array(numFeatures).fill(0));
    this.biases = new Array(this.numClasses).fill(0);

    for (let iter = 0; iter < this.iterations; iter++) {
      const gradW = Array.from({ length: this.numClasses }, () => new Array(numFeatures).fill(0));
      const gradB = new Array(this.numClasses).fill(0);

      for (let i = 0; i < numSamples; i++) {
        const logits = this.weights.map((w, c) => {
          let sum = this.biases[c];
          for (let f = 0; f < numFeatures; f++) {
            sum += w[f] * XNorm[i][f];
          }
          return sum;
        });

        const probs = this._softmax(logits);
        const target = y[i];

        for (let c = 0; c < this.numClasses; c++) {
          const indicator = target === c ? 1 : 0;
          const error = probs[c] - indicator;

          for (let f = 0; f < numFeatures; f++) {
            gradW[c][f] += error * XNorm[i][f];
          }
          gradB[c] += error;
        }
      }

      for (let c = 0; c < this.numClasses; c++) {
        for (let f = 0; f < numFeatures; f++) {
          this.weights[c][f] -= (this.lr * gradW[c][f]) / numSamples;
        }
        this.biases[c] -= (this.lr * gradB[c]) / numSamples;
      }
    }
  }

  predict(X) {
    const XNorm = this._normalize(X, false);
    return XNorm.map((row) => {
      const logits = this.weights.map((w, c) => {
        let sum = this.biases[c];
        for (let f = 0; f < row.length; f++) {
          sum += w[f] * row[f];
        }
        return sum;
      });
      const probs = this._softmax(logits);
      let bestClass = 0;
      let maxProb = -1;
      probs.forEach((p, idx) => {
        if (p > maxProb) {
          maxProb = p;
          bestClass = idx;
        }
      });
      return bestClass;
    });
  }
}

// --- Classification Decision Tree (Gini Impurity) ---

class ClassificationTreeNode {
  constructor(feature = null, threshold = null, left = null, right = null, classProbs = null, predictedClass = 0) {
    this.feature = feature;
    this.threshold = threshold;
    this.left = left;
    this.right = right;
    this.classProbs = classProbs;
    this.predictedClass = predictedClass;
  }
}

class DecisionTreeClassifier {
  constructor(maxDepth = 5, minSamplesSplit = 3, numClasses = 3) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.numClasses = numClasses;
    this.root = null;
  }

  fit(X, y) {
    this.root = this._buildTree(X, y, 0);
  }

  _gini(y) {
    if (y.length === 0) return 0;
    const counts = new Array(this.numClasses).fill(0);
    y.forEach((lbl) => counts[lbl]++);
    let sumSq = 0;
    counts.forEach((c) => {
      const p = c / y.length;
      sumSq += p * p;
    });
    return 1 - sumSq;
  }

  _majorityClass(y) {
    if (y.length === 0) return 0;
    const counts = new Array(this.numClasses).fill(0);
    y.forEach((lbl) => counts[lbl]++);
    let maxCount = -1;
    let best = 0;
    counts.forEach((cnt, idx) => {
      if (cnt > maxCount) {
        maxCount = cnt;
        best = idx;
      }
    });
    return best;
  }

  _buildTree(X, y, depth) {
    const numSamples = X.length;
    const numFeatures = X[0]?.length || 0;
    const majority = this._majorityClass(y);

    if (depth >= this.maxDepth || numSamples < this.minSamplesSplit || numFeatures === 0) {
      return new ClassificationTreeNode(null, null, null, null, null, majority);
    }

    const currentGini = this._gini(y);
    if (currentGini === 0) {
      return new ClassificationTreeNode(null, null, null, null, null, majority);
    }

    let bestFeature = null;
    let bestThreshold = null;
    let bestGain = -Infinity;

    for (let f = 0; f < numFeatures; f++) {
      const values = X.map((r) => r[f]);
      const uniqueVals = Array.from(new Set(values)).sort((a, b) => a - b);
      const step = Math.max(1, Math.floor(uniqueVals.length / 8));

      for (let i = 0; i < uniqueVals.length - 1; i += step) {
        const threshold = (uniqueVals[i] + uniqueVals[i + 1]) / 2;

        const leftY = [];
        const rightY = [];
        for (let idx = 0; idx < numSamples; idx++) {
          if (X[idx][f] <= threshold) leftY.push(y[idx]);
          else rightY.push(y[idx]);
        }

        if (leftY.length === 0 || rightY.length === 0) continue;

        const weightedGini = (leftY.length / numSamples) * this._gini(leftY) + (rightY.length / numSamples) * this._gini(rightY);
        const gain = currentGini - weightedGini;

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = f;
          bestThreshold = threshold;
        }
      }
    }

    if (bestGain <= 0 || bestFeature === null) {
      return new ClassificationTreeNode(null, null, null, null, null, majority);
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

    return new ClassificationTreeNode(bestFeature, bestThreshold, leftNode, rightNode, null, majority);
  }

  predict(X) {
    return X.map((row) => this._traverse(this.root, row));
  }

  _traverse(node, row) {
    if (!node) return 0;
    if (node.feature === null || node.threshold === null) {
      return node.predictedClass;
    }
    if (row[node.feature] <= node.threshold) {
      return this._traverse(node.left, row);
    } else {
      return this._traverse(node.right, row);
    }
  }
}

// --- Random Forest Classifier ---

class RandomForestClassifierModel {
  constructor(numTrees = 15, maxDepth = 5, sampleRatio = 0.8, numClasses = 3) {
    this.numTrees = numTrees;
    this.maxDepth = maxDepth;
    this.sampleRatio = sampleRatio;
    this.numClasses = numClasses;
    this.trees = [];
  }

  fit(X, y) {
    this.trees = [];
    const n = X.length;
    const sampleSize = Math.max(2, Math.floor(n * this.sampleRatio));

    for (let t = 0; t < this.numTrees; t++) {
      const sampleX = [];
      const sampleY = [];
      for (let i = 0; i < sampleSize; i++) {
        const idx = Math.floor(Math.random() * n);
        sampleX.push(X[idx]);
        sampleY.push(y[idx]);
      }

      const tree = new DecisionTreeClassifier(this.maxDepth, 3, this.numClasses);
      tree.fit(sampleX, sampleY);
      this.trees.push(tree);
    }
  }

  predict(X) {
    if (this.trees.length === 0) return X.map(() => 0);
    const allTreePreds = this.trees.map((t) => t.predict(X));
    const finalPreds = [];

    for (let i = 0; i < X.length; i++) {
      const voteCounts = new Array(this.numClasses).fill(0);
      for (let t = 0; t < this.trees.length; t++) {
        const vote = allTreePreds[t][i];
        voteCounts[vote]++;
      }
      let majority = 0;
      let maxVotes = -1;
      voteCounts.forEach((cnt, idx) => {
        if (cnt > maxVotes) {
          maxVotes = cnt;
          majority = idx;
        }
      });
      finalPreds.push(majority);
    }

    return finalPreds;
  }
}

// --- Model Training & Comparison Runner ---

function trainAndCompareClassification(trainData, testData) {
  const XTrain = trainData.map((d) => d.features);
  const yTrain = trainData.map((d) => d.target);

  const XTest = testData.map((d) => d.features);
  const yTest = testData.map((d) => d.target);

  // 1. Logistic Regression
  const lr = new LogisticRegressionClassifierModel(0.06, 500, 3);
  lr.fit(XTrain, yTrain);
  const lrPreds = lr.predict(XTest);
  const lrMetrics = evaluateClassification(yTest, lrPreds, 3);

  // 2. Random Forest Classifier
  const rf = new RandomForestClassifierModel(16, 5, 0.85, 3);
  rf.fit(XTrain, yTrain);
  const rfPreds = rf.predict(XTest);
  const rfMetrics = evaluateClassification(yTest, rfPreds, 3);

  return {
    models: {
      logisticRegression: {
        name: 'Logistic Regression',
        type: 'Probabilistic / Softmax',
        model: lr,
        metrics: lrMetrics,
      },
      randomForest: {
        name: 'Random Forest Classifier',
        type: 'Ensemble (Bagging with Gini Impurity)',
        model: rf,
        metrics: rfMetrics,
      },
    },
    sampleCount: {
      train: trainData.length,
      test: testData.length,
    },
  };
}

module.exports = {
  CLASS_NAMES,
  evaluateClassification,
  LogisticRegressionClassifierModel,
  RandomForestClassifierModel,
  trainAndCompareClassification,
};
