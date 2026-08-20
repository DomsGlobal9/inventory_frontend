export const queryKeys = {
  products: ['products'],
  product: (id: string) => ['product', id],

  variants: (productId: string) => ['variants', productId],

  transactions: ['transactions'],

  dashboard: ['dashboard'],
};
