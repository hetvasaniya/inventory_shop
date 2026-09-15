export const DRAWER_WIDTH = 260;
export const DRAWER_WIDTH_COLLAPSED = 72;
export const NAVBAR_HEIGHT = 64;

export const ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  CASHIER: 'cashier',
};

export const STOCK_STATUS = {
  IN_STOCK: 'in_stock',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
};

export const PRODUCT_CATEGORIES = [
  'Groceries',
  'Dairy',
  'Beverages',
  'Snacks',
  'Personal Care',
  'Household',
  'Frozen Foods',
  'Bakery',
  'Fruits & Vegetables',
  'Meat & Poultry',
  'Baby Products',
  'Stationery',
  'Electronics',
  'Clothing',
  'Other',
];

export const GST_RATES = [0, 5, 12, 18, 28];

export const UNITS = [
  'pcs',
  'kg',
  'g',
  'L',
  'ml',
  'dozen',
  'pack',
  'box',
  'bottle',
  'can',
  'bag',
  'roll',
  'meter',
  'pair',
];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman & Nicobar Islands', 'Chandigarh', 'Dadra & Nagar Haveli and Daman & Diu',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

export const SIDEBAR_MENU = [
  { title: 'Dashboard', path: '/', icon: 'Dashboard', ownerOnly: true },
  { title: 'Billing (POS)', path: '/billing', icon: 'PointOfSale', workerAllowed: true },
  { title: 'Bill History', path: '/bills', icon: 'Receipt', workerAllowed: true },
  { title: 'Inventory', path: '/inventory', icon: 'Inventory2', ownerOnly: true },
  { title: 'Purchase Orders', path: '/purchase-orders', icon: 'ShoppingCart', ownerOnly: true },
  { title: 'Suppliers', path: '/suppliers', icon: 'LocalShipping', ownerOnly: true },
  { title: 'Sticker Print', path: '/stickers', icon: 'QrCode2', ownerOnly: true },
  { title: 'Coupons', path: '/coupons', icon: 'LocalOffer', ownerOnly: true },
  { title: 'Sales Dashboard', path: '/sales', icon: 'TrendingUp', ownerOnly: true },
  { title: 'Reports', path: '/reports', icon: 'Assessment', ownerOnly: true },
  { title: 'Settings', path: '/settings', icon: 'Settings', ownerOnly: true },
];
