import React from 'react';
import { Check, AlertCircle } from 'lucide-react';

/**
 * How the last run ended, read from the job rather than from state a button set.
 *
 * That difference is the point. The old panels kept "made" and "failed" in their own React
 * state, so the answer existed only in the tab that pressed the button: reload the page, open
 * the product on a phone, or be a different person, and there was nothing to see -- even though
 * the photographs were right there. A row survives all three.
 *
 * Both panels show this, so it is one component. Two copies would be two places for the wording
 * to drift, and these sentences are the only thing a shop has to go on when something did not
 * work.
 */
export default function PhotoJobOutcome({ jobs, kind, doneText }) {
  const finished = (jobs ?? []).filter(
    j => j.kind === kind && j.status !== 'QUEUED' && j.status !== 'RUNNING'
  );
  if (finished.length === 0) return null;

  /*
   * Everything from around the last run, not just the newest row.
   *
   * A shop asking for four colours gets four jobs, and showing only the most recent would say
   * "Maroon is done" while quietly dropping that Teal failed. The failures are the part somebody
   * has to act on, so they are never the ones left out.
   */
  const newest = new Date(finished[0].finishedAt || finished[0].createdAt).getTime();
  const recent = finished.filter(
    j => newest - new Date(j.finishedAt || j.createdAt).getTime() < 30 * 60 * 1000
  );

  const done = recent.filter(j => j.status === 'DONE');
  const problems = recent.filter(j => j.status !== 'DONE');

  // A job carries its own message only when something is worth saying -- a partial set, mostly.
  // That sentence beats any summary we could write here, so it wins when there is one.
  const withMessage = done.find(j => j.message);

  return (
    <>
      {done.length > 0 && (
        <p style={{
          fontSize: '13px', color: 'var(--success, #16A34A)', marginTop: '10px',
          display: 'flex', alignItems: 'flex-start', gap: '6px'
        }}>
          <Check size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>
            {done.length === 1 && withMessage
              ? `${withMessage.colourName}: ${withMessage.message}`
              : (doneText?.(done) ?? `Made: ${done.map(j => j.colourName).join(', ')}.`)}
          </span>
        </p>
      )}

      {problems.map(j => (
        <p key={j.id} style={{
          fontSize: '13px', color: '#B45309', margin: '6px 0 0',
          display: 'flex', alignItems: 'flex-start', gap: '6px'
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span><b>{j.colourName}</b> &mdash; {j.message || 'That one did not finish. Please try again.'}</span>
        </p>
      ))}
    </>
  );
}
