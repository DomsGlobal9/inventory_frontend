import { api } from '../lib/api';

/**
 * Sets of photographs being made on the server.
 *
 * Generation used to happen in this tab: the page opened the stream to the photo studio and the
 * page saved every view that came back. That meant whoever pressed the button had to sit and
 * watch it for the better part of a minute -- and closing the tab, or simply opening another
 * screen, threw the work away after it had already been paid for.
 *
 * Now the browser only ever asks for it and then asks how it is going. Every call here returns
 * straight away, and none of them has to be waited on before the person does something else.
 */

export type PhotoJobKind = 'VIEWS' | 'COLOUR';
export type PhotoJobStatus = 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED' | 'CANCELLED';

export interface PhotoJob {
  id: string;
  productId: string;
  kind: PhotoJobKind;
  status: PhotoJobStatus;
  colourName: string;
  colourHex: string | null;
  viewsDone: number;
  viewsTotal: number;
  /** Why it failed or stopped, already in words worth showing. Shown as written. */
  message: string | null;
  createdAt: string;
  finishedAt: string | null;
  seenAt: string | null;
}

/** A colour no job could be made for, and why. */
export interface PhotoJobRefusal { colour: string; why: string; }

/**
 * Ask for photographs.
 *
 * `colours` are names as the shop wrote them; the server works out the sizes, the source
 * photograph and the model for itself rather than being told. Answers with what it queued AND
 * what it would not -- three started and one refused is a real outcome and is worth showing.
 */
export async function startPhotoJobs(input: {
  productId: string;
  kind: PhotoJobKind;
  colours: string[];
  /** A photograph to work from: sent when the shop has just uploaded a flat-lay for this run. */
  sourceImageId?: string;
}): Promise<{ made: PhotoJob[]; refused: PhotoJobRefusal[] }> {
  const res: any = await api.post('/photo-jobs', input);
  return res?.data ?? res;
}

/** What is being made for one product now, and what was made recently. */
export async function listPhotoJobs(productId: string): Promise<{ active: PhotoJob[]; recent: PhotoJob[] }> {
  const res: any = await api.get('/photo-jobs', { params: { productId } });
  return res?.data ?? res;
}

/** Finished, and nobody has been told yet. Asked for from anywhere in the app. */
export async function photoJobNotices(): Promise<{ unseen: PhotoJob[] }> {
  const res: any = await api.get('/photo-jobs/notices');
  return res?.data ?? res;
}

/** Stop one. Views already made are kept. */
export async function cancelPhotoJob(id: string): Promise<PhotoJob> {
  const res: any = await api.post(`/photo-jobs/${id}/cancel`);
  return res?.data ?? res;
}

/** Clears the notice. All of them, or just the ones named. */
export async function markPhotoJobsSeen(ids?: string[]): Promise<{ seen: number }> {
  const res: any = await api.post('/photo-jobs/seen', ids?.length ? { ids } : {});
  return res?.data ?? res;
}
