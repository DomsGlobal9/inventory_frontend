import { api } from '../lib/api';

export const getProducts = async (params: any = {}) => {
  return api.get('/products', { params });
};

export const getProductById = async (id: string) => {
  return api.get(`/products/${id}`);
};

export const createProduct = async (data: any) => {
  return api.post('/products', data);
};

export const updateProduct = async (id: string, data: any) => {
  return api.patch(`/products/${id}`, data);
};

export const archiveProduct = async (id: string) => {
  return api.post(`/products/${id}/archive`);
};

export const trashProduct = async (id: string) => {
  return api.post(`/products/${id}/trash`);
};

export const restoreProduct = async (id: string) => {
  return api.post(`/products/${id}/restore`);
};

export const hardDeleteProduct = async (id: string) => {
  return api.delete(`/products/${id}/hard`);
};

/** Publish or unpublish a selection at once. See backend productService.bulkSetStatus. */
export const bulkSetProductStatus = async (ids: string[], status: 'ACTIVE' | 'DRAFT') => {
  const response: any = await api.post('/products/bulk-status', { ids, status });
  return response?.data ?? response;
};
