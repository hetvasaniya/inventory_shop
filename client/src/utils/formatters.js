/**
 * Format a number as Indian Rupees
 */
export const formatCurrency = (amount) => {
  if (amount == null || isNaN(amount)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format date to readable string
 */
export const formatDate = (date) => {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};

/**
 * Format date with time
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

/**
 * Format a number as compact (1K, 1M, etc.)
 */
export const formatCompact = (num) => {
  if (num == null || isNaN(num)) return '0';
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(num);
};

/**
 * Get stock level info
 */
export const getStockLevel = (currentStock, minStock) => {
  if (currentStock <= 0) return { label: 'Out of Stock', color: 'error', severity: 3 };
  const ratio = currentStock / (minStock || 1);
  if (ratio <= 1) return { label: 'Critical', color: 'error', severity: 2 };
  if (ratio <= 2.5) return { label: 'Low Stock', color: 'warning', severity: 1 };
  return { label: 'In Stock', color: 'success', severity: 0 };
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (str, maxLen = 30) => {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
};

/**
 * Generate a random ID (for temp local use)
 */
export const generateId = () =>
  Math.random().toString(36).substring(2) + Date.now().toString(36);
