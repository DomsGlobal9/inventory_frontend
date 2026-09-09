import { api } from '../lib/api';

export const getVariants = async (productId: string) => {
  return api.get(`/products/${productId}/variants`);
};

export const createVariant = async (productId: string, data: any) => {
  return api.post(`/products/${productId}/variants`, data);
};

export const bulkCreateVariants = async (productId: string, variants: any[], applyToAllLocations: boolean = false, supplierId?: string) => {
  // supplierId is optional and only sent when the merchant chose one, so the server keeps
  // treating its absence as "no supplier" rather than as an empty string to look up.
  return api.post(`/products/${productId}/variants/bulk`, {
    variants,
    applyToAllLocations,
    ...(supplierId ? { supplierId } : {})
  });
};

export const bulkUpdateVariants = async (updates: any[], locationId?: string) => {
  // locationId says where a `quantity` column applies. Sent explicitly so the server does not
  // have to guess, which it used to do by looking for a location named MAIN-STORE.
  return api.post(`/variants/bulk-update`, { updates, ...(locationId ? { locationId } : {}) });
};

export const updateVariant = async (id: string, data: any) => {
  return api.patch(`/variants/${id}`, data);
};

export const deleteVariant = async (id: string) => {
  return api.delete(`/variants/${id}`);
};
