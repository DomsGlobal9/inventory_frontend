import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useCatalogConfig() {
  return useQuery({
    queryKey: ['catalog-config'],
    queryFn: async () => {
      const res = await api.get('/catalog/config');
      return res.data; // { SIZE: [...], COLOR: [...], CATEGORY: [...], ... }
    },
    staleTime: 1000 * 60 * 60,      // 1 hour - rarely changes
    gcTime:    1000 * 60 * 60 * 24, // Keep in memory for a day
  });
}

export function useCatalogData() {
  const { data, isLoading, isError } = useCatalogConfig();

  const sizes = data?.SIZE?.map(s => s.value) ?? [];

  const colors = data?.COLOR?.map(c => ({
    code:   c.value,
    name:   c.label,
    value:  c.metadata?.hex ?? '#808080',
    shades: c.metadata?.shades ?? [],
  })) ?? [];

  const materials = data?.MATERIAL?.map(m => m.label) ?? [];

  const designTypes = data?.DESIGN_TYPE?.map(d => d.label) ?? [];

  const productTypes = data?.PRODUCT_TYPE?.map(p => ({
    value: p.value,
    label: p.label,
  })) ?? [];

  const categories = data?.CATEGORY?.map(c => c.value) ?? [];

  const dressByCategory = (data?.DRESS_TYPE ?? []).reduce((acc, item) => {
    const cat = item.category || 'WOMEN';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item.label);
    return acc;
  }, {});

  return {
    isLoading,
    isError,
    sizes,
    colors,
    materials,
    designTypes,
    productTypes,
    categories,
    dressByCategory,
  };
}
