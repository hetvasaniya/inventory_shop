/**
 * Product Recommendations — Apriori Association Rule Mining Engine
 * Performs Market Basket Analysis on multi-item transaction bills.
 * Computes Support, Confidence, and Lift metrics and generates companion recommendations.
 */

/**
 * Run Apriori Algorithm on transaction baskets
 * @param {Array<Array<string>>} baskets - List of item lists per transaction
 * @param {number} minSupport - Minimum support threshold (0.01 - 1.0)
 * @param {number} minConfidence - Minimum confidence threshold (0.05 - 1.0)
 */
function mineAssociationRules(baskets, minSupport = 0.05, minConfidence = 0.2) {
  const totalTransactions = baskets.length;
  if (totalTransactions === 0) {
    return { rules: [], frequentItemsets: [], totalTransactions: 0 };
  }

  // 1. Calculate 1-Itemset counts
  const itemCounts = {};
  baskets.forEach((basket) => {
    basket.forEach((item) => {
      itemCounts[item] = (itemCounts[item] || 0) + 1;
    });
  });

  // Filter 1-itemsets by minSupport
  const frequent1 = {};
  Object.entries(itemCounts).forEach(([item, count]) => {
    const support = count / totalTransactions;
    if (support >= minSupport) {
      frequent1[item] = { count, support: Number(support.toFixed(4)) };
    }
  });

  const frequentItemsList = Object.keys(frequent1);

  // 2. Calculate 2-Itemset counts
  const pairCounts = {};
  baskets.forEach((basket) => {
    const filteredBasket = basket.filter((item) => frequent1[item]);
    for (let i = 0; i < filteredBasket.length; i++) {
      for (let j = i + 1; j < filteredBasket.length; j++) {
        const itemA = filteredBasket[i];
        const itemB = filteredBasket[j];
        const key = itemA < itemB ? `${itemA}:::${itemB}` : `${itemB}:::${itemA}`;
        pairCounts[key] = (pairCounts[key] || 0) + 1;
      }
    }
  });

  // Filter 2-itemsets by minSupport and build association rules
  const rules = [];
  const frequentItemsets = [];

  // Add 1-itemsets to report
  Object.entries(frequent1).forEach(([item, data]) => {
    frequentItemsets.push({
      items: [item],
      support: data.support,
      count: data.count,
    });
  });

  Object.entries(pairCounts).forEach(([pairKey, count]) => {
    const supportAB = count / totalTransactions;
    if (supportAB >= minSupport) {
      const [itemA, itemB] = pairKey.split(':::');
      frequentItemsets.push({
        items: [itemA, itemB],
        support: Number(supportAB.toFixed(4)),
        count,
      });

      const supportA = frequent1[itemA]?.support || 0;
      const supportB = frequent1[itemB]?.support || 0;

      // Rule 1: itemA -> itemB
      if (supportA > 0) {
        const confAtoB = supportAB / supportA;
        if (confAtoB >= minConfidence) {
          const liftAtoB = supportB > 0 ? confAtoB / supportB : 0;
          rules.push({
            antecedent: [itemA],
            consequent: [itemB],
            antecedentStr: itemA,
            consequentStr: itemB,
            support: Number(supportAB.toFixed(4)),
            confidence: Number(confAtoB.toFixed(4)),
            lift: Number(liftAtoB.toFixed(2)),
            ruleText: `${itemA} → ${itemB}`,
            insight: `Customers buying ${itemA} are ${(liftAtoB).toFixed(2)}x more likely to also buy ${itemB}.`,
          });
        }
      }

      // Rule 2: itemB -> itemA
      if (supportB > 0) {
        const confBtoA = supportAB / supportB;
        if (confBtoA >= minConfidence) {
          const liftBtoA = supportA > 0 ? confBtoA / supportA : 0;
          rules.push({
            antecedent: [itemB],
            consequent: [itemA],
            antecedentStr: itemB,
            consequentStr: itemA,
            support: Number(supportAB.toFixed(4)),
            confidence: Number(confBtoA.toFixed(4)),
            lift: Number(liftBtoA.toFixed(2)),
            ruleText: `${itemB} → ${itemA}`,
            insight: `Customers buying ${itemB} are ${(liftBtoA).toFixed(2)}x more likely to also buy ${itemA}.`,
          });
        }
      }
    }
  });

  // Sort rules by Lift descending, then Confidence descending
  rules.sort((a, b) => b.lift - a.lift || b.confidence - a.confidence);

  return {
    rules,
    frequentItemsets: frequentItemsets.sort((a, b) => b.support - a.support),
    totalTransactions,
    minSupportUsed: minSupport,
    minConfidenceUsed: minConfidence,
  };
}

/**
 * Recommend companion items based on a user's current selected cart/basket
 */
function getRecommendationsForBasket(selectedItems, minedRules, limit = 5) {
  if (!selectedItems || selectedItems.length === 0 || !minedRules || minedRules.length === 0) {
    return [];
  }

  const selectedSet = new Set(selectedItems.map((s) => s.trim().toLowerCase()));
  const candidateScores = {};

  minedRules.forEach((rule) => {
    const antecedentMatch = rule.antecedent.every((ant) => selectedSet.has(ant.toLowerCase()));
    if (antecedentMatch) {
      rule.consequent.forEach((cons) => {
        if (!selectedSet.has(cons.toLowerCase())) {
          if (!candidateScores[cons]) {
            candidateScores[cons] = {
              item: cons,
              maxLift: rule.lift,
              maxConfidence: rule.confidence,
              matchedRules: [rule],
            };
          } else {
            candidateScores[cons].maxLift = Math.max(candidateScores[cons].maxLift, rule.lift);
            candidateScores[cons].maxConfidence = Math.max(candidateScores[cons].maxConfidence, rule.confidence);
            candidateScores[cons].matchedRules.push(rule);
          }
        }
      });
    }
  });

  const recommendations = Object.values(candidateScores).sort(
    (a, b) => b.maxLift - a.maxLift || b.maxConfidence - a.maxConfidence
  );

  return recommendations.slice(0, limit);
}

module.exports = {
  mineAssociationRules,
  getRecommendationsForBasket,
};
