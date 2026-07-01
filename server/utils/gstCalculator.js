/**
 * GST Calculator Utility
 *
 * Indian GST is split equally into CGST + SGST for intra-state transactions.
 * For inter-state, IGST applies (not implemented yet — most retail is intra-state).
 *
 * Standard GST rates: 0%, 5%, 12%, 18%, 28%
 */

/**
 * Calculate GST components from a base price (exclusive of GST).
 *
 * @param {number} basePrice - Price before GST
 * @param {number} gstRate - GST rate in percentage (e.g., 18)
 * @returns {object} { basePrice, cgstRate, sgstRate, cgst, sgst, totalGst, priceWithGst }
 */
const calculateGST = (basePrice, gstRate = 18) => {
  const cgstRate = gstRate / 2;
  const sgstRate = gstRate / 2;
  const cgst = roundTo2((basePrice * cgstRate) / 100);
  const sgst = roundTo2((basePrice * sgstRate) / 100);
  const totalGst = roundTo2(cgst + sgst);
  const priceWithGst = roundTo2(basePrice + totalGst);

  return {
    basePrice: roundTo2(basePrice),
    cgstRate,
    sgstRate,
    cgst,
    sgst,
    totalGst,
    priceWithGst,
  };
};

/**
 * Extract GST from an inclusive price (price already includes GST).
 *
 * @param {number} inclusivePrice - Price including GST
 * @param {number} gstRate - GST rate in percentage
 * @returns {object} { basePrice, cgst, sgst, totalGst, inclusivePrice }
 */
const extractGSTFromInclusive = (inclusivePrice, gstRate = 18) => {
  const basePrice = roundTo2(inclusivePrice / (1 + gstRate / 100));
  const totalGst = roundTo2(inclusivePrice - basePrice);
  const cgst = roundTo2(totalGst / 2);
  const sgst = roundTo2(totalGst / 2);

  return {
    basePrice,
    cgstRate: gstRate / 2,
    sgstRate: gstRate / 2,
    cgst,
    sgst,
    totalGst,
    inclusivePrice: roundTo2(inclusivePrice),
  };
};

/**
 * Calculate GST for a bill item (quantity × price).
 *
 * @param {number} pricePerUnit - Selling price per unit (inclusive of GST)
 * @param {number} quantity - Number of units
 * @param {number} gstRate - GST rate
 * @returns {object} { baseAmount, cgst, sgst, totalGst, itemTotal }
 */
const calculateItemGST = (pricePerUnit, quantity, gstRate = 18) => {
  const totalPrice = roundTo2(pricePerUnit * quantity);
  const baseAmount = roundTo2(totalPrice / (1 + gstRate / 100));
  const totalGst = roundTo2(totalPrice - baseAmount);
  const cgst = roundTo2(totalGst / 2);
  const sgst = roundTo2(totalGst / 2);

  return {
    baseAmount,
    cgst,
    sgst,
    totalGst,
    itemTotal: totalPrice,
  };
};

/**
 * Round a number to 2 decimal places.
 * @param {number} num
 * @returns {number}
 */
const roundTo2 = (num) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

module.exports = { calculateGST, extractGSTFromInclusive, calculateItemGST, roundTo2 };
