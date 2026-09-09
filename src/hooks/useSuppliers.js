import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { optimisticRowPatch, restoreRows } from '../lib/invalidate';

export const useSuppliers = () => {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const response = await api.get('/suppliers');
      return response.data;
    }
  });
};

export const useSupplier = (id) => {
  return useQuery({
    queryKey: ['suppliers', id],
    queryFn: async () => {
      const response = await api.get(`/suppliers/${id}`);
      return response.data;
    },
    enabled: !!id
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/suppliers', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Supplier created successfully');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to create supplier');
    }
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/suppliers/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      toast.success('Supplier updated successfully');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers', variables.id] });
      // SupplierDetails.jsx queries ['supplier', id] (singular). Invalidating only the
      // plural key refreshed the list but never the detail page you were looking at.
      queryClient.invalidateQueries({ queryKey: ['supplier', variables.id] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update supplier');
    }
  });
};

// ─── SUPPLIER <-> PRODUCT CATALOGUE ───
//
// Which supplier sells which item. Both directions read the same relationship: the supplier
// page asks "what do we buy from them", the product page asks "who do we buy this from".

export const useSupplierProducts = (supplierId, search) => {
  return useQuery({
    queryKey: ['supplier-products', supplierId, search || ''],
    queryFn: async () => {
      const params = search ? { search } : undefined;
      return (await api.get(`/suppliers/${supplierId}/products`, { params })).data;
    },
    enabled: Boolean(supplierId)
  });
};

export const useVariantSuppliers = (variantId) => {
  return useQuery({
    queryKey: ['variant-suppliers', variantId],
    queryFn: async () => (await api.get(`/variants/${variantId}/suppliers`)).data,
    enabled: Boolean(variantId)
  });
};

// Both sides of the relationship are cached separately, so every mutation has to clear both
// or the page you are not looking at keeps showing a link that no longer exists.
const invalidateBothSides = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: ['supplier-products'] });
  queryClient.invalidateQueries({ queryKey: ['variant-suppliers'] });
};

export const useLinkSupplierProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post('/supplier-products', payload)).data,
    onSuccess: () => {
      invalidateBothSides(queryClient);
      toast.success('Supplier link saved');
    },
    onError: (error) => toast.error(error?.message || 'Could not save the supplier link')
  });
};

export const useUnlinkSupplierProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/supplier-products/${id}`)).data,
    onSuccess: () => {
      invalidateBothSides(queryClient);
      toast.success('Supplier link removed');
    },
    onError: (error) => toast.error(error?.message || 'Could not remove the supplier link')
  });
};

export const useSetPreferredSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.post(`/supplier-products/${id}/preferred`, {})).data,
    // Preferred is exclusive -- picking one supplier unpicks the others -- so both halves of
    // that are applied at once. Marking the new one true without clearing the old would show
    // two preferred suppliers for a second, which is worse than showing none.
    //
    // Exclusive PER VARIANT, though, not across the list. supplier-product.service clears with
    // `where: { clientId, variantId, isPreferred: true }`, and the supplier's product list
    // spans many variants -- so clearing every other row would visibly unmark the preferred
    // supplier of every OTHER item this supplier provides, until the refetch put them back.
    // Only siblings of the same variant are cleared.
    //
    // Both lists are patched because the same fact is shown in two places: the supplier's
    // product list and the variant's supplier list. Patching one and invalidating the other
    // would leave the two disagreeing on screen at the same moment.
    onMutate: (id) => {
      const findRow = (key) => {
        const cached = queryClient.getQueryData(key);
        const list = Array.isArray(cached)
          ? cached
          : (cached && typeof cached === 'object'
              ? Object.values(cached).find(v => Array.isArray(v))
              : null);
        return Array.isArray(list) ? list.find(row => row.id === id) : null;
      };
      const target = findRow(['supplier-products']) || findRow(['variant-suppliers']);
      const variantId = target?.variantId;

      // Without knowing which variant this link belongs to there is no safe way to say which
      // rows stop being preferred, so only the chosen row is marked and the refetch settles
      // the rest. A brief second preferred badge beats wrongly clearing someone else's.
      const sibling = (row) => row.id !== id && (variantId ? row.variantId === variantId : false);

      const parts = [
        optimisticRowPatch(queryClient, ['supplier-products'], sibling, { isPreferred: false }),
        optimisticRowPatch(queryClient, ['variant-suppliers'], sibling, { isPreferred: false }),
        optimisticRowPatch(queryClient, ['supplier-products'], row => row.id === id, { isPreferred: true }),
        optimisticRowPatch(queryClient, ['variant-suppliers'], row => row.id === id, { isPreferred: true })
      ];
      return { parts };
    },
    onError: (error, _id, context) => {
      // Unwound in reverse, so the earliest snapshot is the one that ends up restored.
      (context?.parts || []).slice().reverse().forEach(part => restoreRows(queryClient, part));
      toast.error(error?.message || 'Could not set the preferred supplier');
    },
    onSuccess: () => toast.success('Preferred supplier updated'),
    onSettled: () => invalidateBothSides(queryClient)
  });
};
