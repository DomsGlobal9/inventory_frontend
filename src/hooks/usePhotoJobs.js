import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { usePermission } from './usePermission';
import {
  startPhotoJobs, listPhotoJobs, photoJobNotices, cancelPhotoJob, markPhotoJobsSeen
} from '../services/photoJobs.service';

/**
 * Watching photographs being made, without holding them open.
 *
 * The page used to BE the generation -- it held the stream and did the saving, so the progress
 * was simply local state and vanished with the component. Now the work is on the server and the
 * screen is a reader: it asks how things are going, and the answer is the same whoever asks,
 * from whichever screen, on whichever device.
 */

const JOBS_KEY = (productId) => ['photo-jobs', 'product', productId];
const NOTICES_KEY = ['photo-jobs', 'notices'];

/**
 * How often to ask while something is being made.
 *
 * Three seconds while there is a job to watch, and NOTHING at all when there is not. A product
 * screen with no generation running is the overwhelmingly common case, and polling through it
 * would put a request every few seconds against every open product tab in every shop, all day,
 * for news that cannot arrive.
 */
const WHILE_RUNNING_MS = 3000;

/** What is being made for this product, and what was made recently. */
export const usePhotoJobs = (productId) => {
  return useQuery({
    queryKey: JOBS_KEY(productId),
    queryFn: () => listPhotoJobs(productId),
    enabled: !!productId,
    refetchInterval: (query) => (query.state.data?.active?.length ? WHILE_RUNNING_MS : false)
  });
};

/**
 * Finished, and not yet told about -- asked for app-wide.
 *
 * Twenty seconds, not the bell's ten: a set of photographs takes about a minute, so asking
 * faster only costs requests. Permission-gated for the same reason the bell is -- a salesperson
 * polling an endpoint that refuses them is a 403 in the console every twenty seconds and a
 * request counted against the rate limit for news they are not allowed to have.
 */
export const usePhotoJobNotices = () => {
  const { can } = usePermission();
  const allowed = can('product:view');
  return useQuery({
    queryKey: NOTICES_KEY,
    queryFn: photoJobNotices,
    enabled: allowed,
    refetchInterval: allowed ? 20000 : false
  });
};

/**
 * Ask for photographs.
 *
 * Returns as fast as any other button. The screen is told what was queued and what was not,
 * and then gets on with polling -- there is nothing to wait for and nothing to block.
 */
export const useStartPhotoJobs = (productId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startPhotoJobs,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: JOBS_KEY(productId) });
      // Each refusal on its own line. Rolling them into one sentence hides which colour had
      // which problem, which is the only part the shop can do anything about.
      for (const r of result?.refused ?? []) toast.error(`${r.colour}: ${r.why}`);
    },
    onError: (error) => toast.error(error?.message || 'Those photographs could not be started.')
  });
};

/** Stop one. Whatever was already made is kept, and the message says so. */
export const useCancelPhotoJob = (productId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelPhotoJob,
    onSettled: () => queryClient.invalidateQueries({ queryKey: JOBS_KEY(productId) }),
    onError: (error) => toast.error(error?.message || 'That could not be stopped.')
  });
};

/** Clears the notice once somebody has actually seen it. */
export const useMarkPhotoJobsSeen = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markPhotoJobsSeen,
    onSettled: () => queryClient.invalidateQueries({ queryKey: NOTICES_KEY })
  });
};
