import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

const KEY = ['branding'];

/**
 * The shop's own name and logo.
 *
 * Read by anyone signed in -- these appear wherever the app identifies the shop to its own
 * staff -- and written only by the account owner, which the backend enforces; the UI hides
 * the controls as a courtesy, not as the boundary.
 *
 * staleTime is generous because this is the one thing on the screen that genuinely almost
 * never changes, and every page that shows it would otherwise re-ask on mount.
 */
export function useBranding() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await api.get('/branding')).data,
    staleTime: 5 * 60 * 1000
  });
}

export function useSetBusinessName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (businessName) => (await api.put('/branding/name', { businessName })).data,
    onSuccess: (data) => {
      qc.setQueryData(KEY, data);
      toast.success('Shop name saved');
    }
  });
}

/**
 * Upload, then record.
 *
 * The same three steps product images use: ask the server to prepare an upload (it derives
 * the storage path from the session's tenant), PUT the bytes to the single-use URL it
 * returns, then tell the server which path to record. The browser never supplies a clientId
 * and never holds a Supabase key.
 */
export function useUploadLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file) => {
      const prepared = (await api.post('/branding/logo/upload-url', { fileName: file.name })).data;
      const { storagePath, signedUrl } = prepared || {};
      if (!storagePath || !signedUrl) throw new Error('Could not prepare the upload. Please try again.');

      // A plain axios call on purpose: the signed URL carries its own authorisation, and
      // `api` would attach our session cookies to a third-party origin.
      const put = await axios.put(signedUrl, file, {
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        validateStatus: () => true,
        timeout: 120000
      });
      if (put.status >= 400) throw new Error('The logo could not be uploaded. Check your connection and try again.');

      return (await api.put('/branding/logo', { storagePath })).data;
    },
    onSuccess: (data) => {
      qc.setQueryData(KEY, data);
      toast.success('Logo updated');
    },
    onError: (err) => toast.error(err?.message || 'The logo could not be uploaded.')
  });
}

export function useRemoveLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.delete('/branding/logo')).data,
    onSuccess: (data) => {
      qc.setQueryData(KEY, data);
      toast.success('Logo removed');
    }
  });
}
