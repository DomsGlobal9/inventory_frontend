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

  /**
   * Sizes grouped by the category they belong to.
   *
   * The wizard showed one flat size list to every product, so a Kids garment offered
   * XS to XXL -- children's clothes are sold by age, and the seeded list had no way to say so.
   * DRESS_TYPE has been category-scoped in this same table since the beginning
   * (Saree@WOMEN, Lehenga@WOMEN); sizes simply never were.
   *
   * Items with no category land under `null` and act as the fallback, which keeps this
   * correct both before the category-scoped sizes are seeded and for any client who has
   * never tagged theirs.
   */
  const sizesByCategory = (data?.SIZE ?? []).reduce((acc, item) => {
    const cat = item.category || null;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item.value);
    return acc;
  }, {});

  /** The sizes to offer for one category, falling back to the untagged list. */
  const sizesFor = (category) => {
    const scoped = sizesByCategory[category];
    if (scoped && scoped.length > 0) return scoped;
    return sizesByCategory[null] ?? sizes;
  };

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
    sizesByCategory,
    sizesFor,
    colors,
    materials,
    designTypes,
    productTypes,
    categories,
    dressByCategory,
  };
}
