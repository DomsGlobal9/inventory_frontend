import { api } from '../lib/api';

export const getVariants = async (productId: string) => {
  return api.get(`/products/${productId}/variants`);
};

export const createVariant = async (productId: string, data: any) => {
  return api.post(`/products/${productId}/variants`, data);
};

export const bulkCreateVariants = async (productId: string, variants: any[], applyToAllLocations: boolean = false) => {
  return api.post(`/products/${productId}/variants/bulk`, { variants, applyToAllLocations });
};

export const bulkUpdateVariants = async (updates: any[]) => {
  return api.post(`/variants/bulk-update`, { updates });
};

export const updateVariant = async (id: string, data: any) => {
  return api.patch(`/variants/${id}`, data);
};

export const deleteVariant = async (id: string) => {
  return api.delete(`/variants/${id}`);
};
