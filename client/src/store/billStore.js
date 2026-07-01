import { create } from 'zustand';

const useBillStore = create((set, get) => ({
  items: [],
  customer: { name: '', phone: '' },
  coupon: null,
  couponDiscount: 0,

  addItem: (product) => {
    const { items } = get();
    const existing = items.find((i) => i.product._id === product._id);
    if (existing) {
      set({
        items: items.map((i) =>
          i.product._id === product._id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ),
      });
    } else {
      set({
        items: [
          ...items,
          {
            product,
            quantity: 1,
            price: product.sellingPrice,
            gstRate: product.gstRate || 0,
          },
        ],
      });
    }
  },

  removeItem: (productId) => {
    set({ items: get().items.filter((i) => i.product._id !== productId) });
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set({
      items: get().items.map((i) =>
        i.product._id === productId ? { ...i, quantity } : i
      ),
    });
  },

  setCustomer: (customer) => set({ customer }),

  applyCoupon: (coupon, discount) =>
    set({ coupon, couponDiscount: discount }),

  removeCoupon: () => set({ coupon: null, couponDiscount: 0 }),

  getSubtotal: () =>
    get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

  getGstTotal: () =>
    get().items.reduce(
      (sum, i) => sum + (i.price * i.quantity * i.gstRate) / 100,
      0
    ),

  getTotal: () => {
    const subtotal = get().getSubtotal();
    const gst = get().getGstTotal();
    const discount = get().couponDiscount;
    return subtotal + gst - discount;
  },

  getItemCount: () =>
    get().items.reduce((sum, i) => sum + i.quantity, 0),

  clearBill: () =>
    set({
      items: [],
      customer: { name: '', phone: '' },
      coupon: null,
      couponDiscount: 0,
    }),
}));

export default useBillStore;
