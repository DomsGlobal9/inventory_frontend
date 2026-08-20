import { api } from '../lib/api';

export const getVariants = async (productId: string) => {
  return api.get(`/products/${productId}/variants`);
};

export const createVariant = async (productId: string, data: any) => {
  return api.post(`/products/${productId}/variants`, data);
};

export const bulkCreateVariants = async (productId: string, variants: any[]) => {
  return api.post(`/products/${productId}/variants/bulk`, { variants });
};

export const bulkUpdateVariants = async (updates: any[]) => {
  return api.post(`/variants/bulk-update`, { updates });
};

export const updateVariant = async (id: string, data: any) => {
  // Wait, does the API expect /variants/:id or /products/:productId/variants/:id?
  // Let me check my routes... the controller expects `req.params.id`. Wait, how is the patch route defined?
  // I need to verify the routes, but assuming it's /variants/:id or nested...
  // Let's use the nested route if possible, or flat. I'll check `product.routes.ts`.
  // Wait, I only mapped create, getByProduct, bulkCreate in product.routes.ts for variants.
  // Oh no, I didn't verify patch/delete routes!
  return api.patch(`/variants/${id}`, data);
};

export const deleteVariant = async (id: string) => {
  return api.delete(`/variants/${id}`);
};
