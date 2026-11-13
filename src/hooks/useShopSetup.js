import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

/**
 * "Set up your shop" (PLAN-onboarding-setup.md). GET /setup -> { sells, suggested, setupDone, missing, fabricMinCut,
 * fabricsOn, boutique }. What the shop sells shapes the app, so it is read by everyone signed in; only the owner saves.
 */
const KEY = ['shop-setup'];
export const OPEN_SETUP_EVENT = 'scaleezy:open-setup';
const LATER_KEY = 'scaleezy_setup_later';
const LATER_EVENT = 'scaleezy:setup-later';

export function useShopSetup(enabled = true) {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await api.get('/setup')).data,
    enabled,
    staleTime: 30_000,
    retry: 1
  });
}

export function useSaveSetup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch) => (await api.put('/setup', patch)).data,
    onSuccess: (data) => qc.setQueryData(KEY, data),
    // What the shop sells switches fabrics on or off, and the shop's details feed the top-bar warning.
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['fabrics'] });
      qc.invalidateQueries({ queryKey: KEY });
    }
  });
}

/** "Do it later": for this visit only. The warning in the top bar stays until the setup is done. */
export function putOffSetup() {
  try { sessionStorage.setItem(LATER_KEY, '1'); } catch { /* private window */ }
  window.dispatchEvent(new Event(LATER_EVENT));
}

export function useSetupPutOff() {
  const read = () => { try { return sessionStorage.getItem(LATER_KEY) === '1'; } catch { return false; } };
  const [later, setLater] = useState(read);
  useEffect(() => {
    const on = () => setLater(read());
    window.addEventListener(LATER_EVENT, on);
    return () => window.removeEventListener(LATER_EVENT, on);
  }, []);
  return later;
}

export const SELLS_OPTIONS = [
  { value: 'READY_MADE', title: 'Ready-made garments', line: 'Sarees, blouses, kurtis and lehengas, sold by the piece.' },
  { value: 'FABRICS', title: 'Fabrics and materials', line: 'Fabric, lining, lace and borders sold by the metre; accessories by the packet.' },
  { value: 'BOTH', title: 'Garments and fabrics', line: 'Ready-made garments by the piece and fabric by the metre.' }
];
export const sellsLabel = (v) => SELLS_OPTIONS.find(o => o.value === v)?.title ?? 'Not selected';
