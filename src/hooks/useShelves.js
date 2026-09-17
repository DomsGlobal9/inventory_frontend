import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { invalidateDerivedViews } from '../lib/invalidate';

/**
 * Racks and shelves: where inside a location the pieces are.
 *
 * Every write here moves pieces between shelves or changes the rack tree; none of them changes how
 * many a location holds. After a write, everything shelf-shaped is refetched, and the stock views too
 * (a put-away list, a product's "where" line, the inventory overview all read the same numbers).
 */

export const SHELF_KEYS = {
  all: ['shelves'],
  tree: (locationId) => ['shelves', 'tree', locationId],
  find: (q, locationId) => ['shelves', 'find', locationId ?? 'all', q],
  variant: (variantId, locationId) => ['shelves', 'variant', variantId, locationId ?? 'all'],
  spot: (spotId) => ['shelves', 'spot', spotId],
  spotHistory: (spotId) => ['shelves', 'spot-history', spotId],
  notShelved: (locationId, page) => ['shelves', 'not-shelved', locationId, page],
  issues: (status, locationId, page) => ['shelves', 'issues', status, locationId ?? 'all', page],
  labels: (locationId, ids) => ['shelves', 'labels', locationId, ids ?? 'all']
};

const refresh = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: SHELF_KEYS.all });
  invalidateDerivedViews(queryClient);
};

/** A shelf label's QR holds "SEZ:" and a code; nothing else a person types looks like that. */
export const isLabelScan = (text) => /^\s*sez:\s*[a-z0-9]{6,16}\s*$/i.test(text ?? '');
/** A typed or scanned address such as FLOOR-C2-1 (not an item's SKU, which the server tells apart). */
export const looksLikeAddress = (text) => /^\s*[a-z0-9]{1,12}(\s*-\s*[a-z0-9]{1,12}){1,3}\s*$/i.test(text ?? '');

export const useSpotTree = (locationId) => useQuery({
  queryKey: SHELF_KEYS.tree(locationId),
  queryFn: async () => (await api.get(`/shelves/locations/${locationId}/spots`)).data,
  enabled: !!locationId,
  staleTime: 15_000
});

export const useShelfFind = (q, locationId) => useQuery({
  queryKey: SHELF_KEYS.find(q, locationId),
  queryFn: async () => (await api.get('/shelves/find', { params: { q, locationId: locationId || undefined } })).data,
  enabled: !!q && q.trim().length > 0,
  staleTime: 5_000,
  placeholderData: (previous) => previous
});

export const useWhereIs = (variantId, locationId) => useQuery({
  queryKey: SHELF_KEYS.variant(variantId, locationId),
  queryFn: async () => (await api.get(`/shelves/variants/${variantId}`, { params: { locationId: locationId || undefined } })).data,
  enabled: !!variantId,
  staleTime: 10_000
});

export const useSpot = (spotId) => useQuery({
  queryKey: SHELF_KEYS.spot(spotId),
  queryFn: async () => (await api.get(`/shelves/spots/${spotId}`)).data,
  enabled: !!spotId,
  staleTime: 5_000
});

export const useSpotHistory = (spotId, enabled = true) => useQuery({
  queryKey: SHELF_KEYS.spotHistory(spotId),
  queryFn: async () => (await api.get(`/shelves/spots/${spotId}/history`)).data,
  enabled: !!spotId && enabled
});

export const useNotShelved = (locationId, page = 1) => useQuery({
  queryKey: SHELF_KEYS.notShelved(locationId, page),
  queryFn: async () => (await api.get(`/shelves/locations/${locationId}/not-shelved`, { params: { page } })).data,
  enabled: !!locationId,
  staleTime: 5_000,
  placeholderData: (previous) => previous
});

export const useShelfIssues = (status = 'OPEN', locationId, page = 1) => useQuery({
  queryKey: SHELF_KEYS.issues(status, locationId, page),
  queryFn: async () => (await api.get('/shelves/issues', { params: { status, locationId: locationId || undefined, page } })).data,
  staleTime: 15_000,
  placeholderData: (previous) => previous
});

export const useSpotLabels = (locationId, ids) => useQuery({
  queryKey: SHELF_KEYS.labels(locationId, ids),
  queryFn: async () => (await api.get(`/shelves/locations/${locationId}/labels`, { params: { spotIds: ids || undefined } })).data,
  enabled: !!locationId
});

/** A scanned label or a typed address, answered with that shelf and what is on it. */
export async function resolveSpot(code, locationId) {
  return (await api.get('/shelves/spots/scan', { params: { code, locationId: locationId || undefined } })).data;
}

const mutation = (fn, { success, fail } = {}) => () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data, variables) => {
      refresh(queryClient);
      const message = typeof success === 'function' ? success(data, variables) : success;
      if (message) toast.success(message);
      if (data?.warning) toast(data.warning, { icon: '⚠️' });
    },
    onError: (error) => toast.error(error?.message || fail || 'That did not work.')
  });
};

export const useCreateSpot = mutation(
  async ({ locationId, ...body }) => (await api.post(`/shelves/locations/${locationId}/spots`, body)).data,
  { success: (spot) => `${spot.address} added.`, fail: 'Could not add that.' }
);

/** With `preview: true` nothing is saved; no toast, the screen shows what would be made. */
export const useBulkSpots = ({ silent = false } = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ locationId, ...body }) => (await api.post(`/shelves/locations/${locationId}/spots/bulk`, body)).data,
    onSuccess: (data) => {
      if (data?.saved) {
        refresh(queryClient);
        toast.success(`${data.create} ${data.create === 1 ? 'spot' : 'spots'} created${data.alreadyThere ? `, ${data.alreadyThere} already there` : ''}.`);
      }
    },
    // A live preview is refused while someone is half-way through typing; the screen shows why.
    onError: (error) => { if (!silent) toast.error(error?.message || 'Could not create those.'); }
  });
};

export const useUpdateSpot = mutation(
  async ({ spotId, ...body }) => (await api.patch(`/shelves/spots/${spotId}`, body)).data,
  { success: 'Saved.', fail: 'Could not save that change.' }
);

export const useRemoveSpot = mutation(
  async ({ spotId }) => (await api.delete(`/shelves/spots/${spotId}`)).data,
  { success: (r) => `${r.address}${r.removed > 1 ? ` and ${r.removed - 1} inside it` : ''} removed.`, fail: 'Could not remove that.' }
);

export const usePutAway = mutation(
  async (body) => (await api.post('/shelves/putaway', body)).data,
  { success: (r, v) => `${v.quantity} put away on ${r.legs?.find(l => l.quantity > 0)?.address ?? 'the shelf'}.`, fail: 'Could not put that away.' }
);

export const useMoveStock = mutation(
  async (body) => (await api.post('/shelves/move', body)).data,
  {
    success: (r, v) => r.kind === 'TAKEN_OFF_SHELF'
      ? `${v.quantity} taken off the shelf.`
      : `${v.quantity} moved to ${r.legs?.find(l => l.quantity > 0)?.address ?? 'the shelf'}.`,
    fail: 'Could not move that.'
  }
);

export const useMoveAll = mutation(
  async (body) => (await api.post('/shelves/move-all', body)).data,
  { success: (r) => `${r.pieces} ${r.pieces === 1 ? 'piece' : 'pieces'} moved from ${r.from} to ${r.to}.${r.failed?.length ? ` ${r.failed.length} could not be moved.` : ''}`, fail: 'Could not move everything.' }
);

export const useResolveIssue = mutation(
  async ({ issueId, note }) => (await api.post(`/shelves/issues/${issueId}/resolve`, { note: note || undefined })).data,
  { success: 'Marked as resolved.', fail: 'Could not resolve that.' }
);

// ── Picking, counting, importing, where movements came from ────────────────────────────────────

export const usePickOrders = (locationId) => useQuery({
  queryKey: ['shelves', 'pick-orders', locationId],
  queryFn: async () => (await api.get('/shelves/pick/orders', { params: { locationId } })).data,
  enabled: !!locationId,
  staleTime: 10_000
});

export const usePickList = (locationId, orderIds) => useQuery({
  queryKey: ['shelves', 'pick-list', locationId, orderIds],
  queryFn: async () => (await api.get('/shelves/pick/list', { params: { locationId, orderIds: orderIds.join(',') } })).data,
  enabled: !!locationId && orderIds.length > 0,
  staleTime: 0
});

export const useReportNotFound = mutation(
  async (body) => (await api.post('/shelves/not-found', body)).data,
  { success: 'Recorded. Someone will count that shelf.', fail: 'Could not record that.' }
);

export const useCountSpot = mutation(
  async ({ spotId, ...body }) => (await api.post(`/shelves/spots/${spotId}/count`, body)).data,
  { success: (r) => `${r.address} counted${r.issues ? ` · ${r.issues} ${r.issues === 1 ? 'difference' : 'differences'} raised` : ' · all matched'}.`, fail: 'Could not record the count.' }
);

export const useImportSpots = ({ silent = false } = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ locationId, ...body }) => (await api.post(`/shelves/locations/${locationId}/spots/import`, body)).data,
    onSuccess: (data) => {
      if (data?.saved) {
        refresh(queryClient);
        toast.success(`${data.create} ${data.create === 1 ? 'spot' : 'spots'} imported.`);
      }
    },
    onError: (error) => { if (!silent) toast.error(error?.message || 'Could not import those.'); }
  });
};

/** Which shelves the pieces of an order (or a dispatch, a transfer) came off. */
export const useShelvesUsed = (referenceType, referenceIds, enabled = true) => useQuery({
  queryKey: ['shelves', 'movements', referenceType, referenceIds],
  queryFn: async () => (await api.get('/shelves/movements', { params: { referenceType, referenceIds } })).data,
  enabled: enabled && !!referenceIds,
  staleTime: 30_000
});

export const SPOT_KINDS = [
  { value: 'AREA', label: 'Area' },
  { value: 'RACK', label: 'Rack' },
  { value: 'CUPBOARD', label: 'Cupboard' },
  { value: 'SHELF', label: 'Shelf' },
  { value: 'BOX', label: 'Box' },
  { value: 'STACK', label: 'Stack' },
  { value: 'BUNDLE', label: 'Bundle' },
  { value: 'RAIL', label: 'Hanging rail' },
  { value: 'RAIL_SECTION', label: 'Rail section' },
  { value: 'COUNTER', label: 'Counter' },
  { value: 'DRAWER', label: 'Drawer' },
  { value: 'DISPLAY', label: 'Display' },
  { value: 'TRUNK', label: 'Trunk' },
  { value: 'OTHER', label: 'Other' }
];
export const kindLabel = (kind) => SPOT_KINDS.find(k => k.value === kind)?.label ?? kind;

export const ISSUE_KINDS = {
  SOLD_FROM_BACK_ROOM: 'Sold from the back room',
  AUTO_TAKEN_FROM_SHELF: 'Taken off a shelf without a choice',
  COUNT_BELOW_SHELVES: 'Count lower than the shelves',
  NOT_FOUND_ON_SHELF: 'Not found on the shelf'
};
