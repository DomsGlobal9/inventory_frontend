import React, { useState, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { useDialog } from '../hooks/useDialog';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', confirmStyle = 'primary', requireTypeToConfirm = null }) {
  const [typedText, setTypedText] = useState('');
  // Whether the confirmed action is still running.
  //
  // It used to call onConfirm() without awaiting it and close immediately. Almost every
  // onConfirm in this app is async -- receiving goods, deleting a product, emailing an order --
  // and this backend is about a second away, so the modal vanished and the user watched an
  // unchanged screen for one to three seconds with nothing to say the work had started. The
  // usual reaction to that is to go and press the thing again.
  //
  // Not awaiting it also meant a failure surfaced as an unhandled promise rejection after the
  // modal had already closed as though it had worked.
  const [busy, setBusy] = useState(false);

  /*
   * The same fact as `busy`, kept where it can be read in the same tick it is written.
   *
   * `busy` is state: setBusy(true) does not take effect until React re-renders. A real
   * double-click delivers two clicks a few milliseconds apart and a triple-click three, all
   * before that render happens -- so every one of them read busy === false from the same
   * closure and every one of them called onConfirm.
   *
   * Demonstrated, not theorised: three clicks on Confirm Order sent three confirms, and a
   * 3+2+1 order came back with nine reservation rows holding eighteen units. The server now
   * refuses the second one outright, which is where correctness belongs -- this stops the
   * request being made at all, so the person does not see an error for something they did
   * not really do twice.
   */
  const inFlight = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setTypedText('');
      setBusy(false);
      inFlight.current = false;
    }
  }, [isOpen]);

  /*
   * A real dialog to a keyboard and a screen reader: focus lands on Cancel (the safe answer to
   * "Cancel this order?"), Tab stays inside, Escape closes, and focus goes back to the button that
   * opened it. It was a plain div -- Tab walked out into the page behind and Escape did nothing.
   * Escape is refused while the action runs, like every other way of closing.
   */
  const titleId = useId();
  const dialogRef = useDialog(isOpen, { onClose, canClose: !busy, initialFocus: '[data-dialog-cancel]' });
  if (!isOpen) return null;

  /** Nothing dismisses this modal while the action it started is still in flight. */
  const closeIfIdle = () => { if (!busy) onClose(); };

  const handleConfirm = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // The caller's mutation already showed what went wrong. Staying open is deliberate:
      // the person can read the message and press again, instead of the modal disappearing
      // and leaving them unsure whether anything happened.
      setBusy(false);
      inFlight.current = false;
    }
  };

  /*
   * Rendered into <body>, not where it was written.
   *
   * Every one of these sits inside the thing it is asking about -- the banner row with its Remove
   * button, the order line, the product card -- and `position: fixed` with z-index 9999 is only
   * worth 9999 INSIDE whatever stacking context it happens to land in. Settings has a sticky
   * sidebar, cards have their own contexts, and framer-motion puts a transform on anything it
   * animates, each of which starts a new context. The result was a dialog with the page's own
   * buttons painted on top of its title -- so "Remove this banner?" appeared with Save, Hide it
   * and the arrows sitting across it, and it was not obvious which layer a click would reach.
   *
   * A portal takes it out of all of them: the overlay is a direct child of <body>, so its z-index
   * competes with the page's top level and nothing inside a card can rise above it. Focus, Escape
   * and the tab trap are unaffected -- they follow the React tree, not the DOM one.
   */
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px'
        }}
        onClick={(e) => { if (e.target === e.currentTarget) closeIfIdle(); }}
      >
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          style={{
            backgroundColor: 'var(--bg-card)', borderRadius: '12px',
            width: '100%', maxWidth: '400px', border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-modal)', display: 'flex', flexDirection: 'column',
            // Never taller than the window, so the buttons cannot end up below the fold.
            // A long message on a short window pushed Cancel and the confirm button off the
            // bottom of the screen, which looks exactly like a dialog with no way to say yes.
            maxHeight: 'calc(100vh - 32px)', overflow: 'hidden'
          }}
        >
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', position: 'relative', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-warning)' }}>
               <AlertTriangle size={24} />
            </div>
            <h2 id={titleId} style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: 'var(--text-primary)', paddingRight: '28px' }}>{title}</h2>
            <button 
              type="button"
              onClick={closeIfIdle}
              disabled={busy}
              aria-label="Close"
              className="btn-icon"
              style={{ position: 'absolute', top: '20px', right: '20px', opacity: busy ? 0.4 : 1, cursor: busy ? 'not-allowed' : 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>
          
          <div style={{ padding: '24px', color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.5', overflowY: 'auto' }}>
            {message}
            {requireTypeToConfirm && (
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Type <strong style={{ color: 'var(--text-primary)' }}>{requireTypeToConfirm}</strong> to confirm
                </label>
                <input
                  type="text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', borderColor: typedText === requireTypeToConfirm ? 'var(--accent-success)' : '' }}
                  autoComplete="off"
                  autoFocus
                />
              </div>
            )}
          </div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'var(--bg-dark)' }}>
            <button type="button" data-dialog-cancel onClick={closeIfIdle} disabled={busy} className="btn-secondary"
              style={{ opacity: busy ? 0.4 : 1, cursor: busy ? 'not-allowed' : 'pointer' }}>
              Cancel
            </button>
            <button 
              type="button"
              onClick={handleConfirm}
              className={confirmStyle === 'danger' ? 'btn-danger' : 'btn-primary'}
              style={{
                // The colour is the .btn-danger class's job. This used to force
                // backgroundColor: var(--accent-warning) inline, a variable that did not exist
                // -- so the background resolved to transparent while color:#fff stayed, and the
                // confirm button on every destructive dialog was white text on a white card.
                // People reported the dialog as having no delete button at all. An inline style
                // also beat the class, so defining .btn-danger alone would not have fixed it.
                // Warning is amber and this button is not a warning, it is the destructive one.
                display: 'flex', alignItems: 'center', gap: '8px',
                opacity: (busy || (requireTypeToConfirm && typedText !== requireTypeToConfirm)) ? 0.5 : 1,
                cursor: (busy || (requireTypeToConfirm && typedText !== requireTypeToConfirm)) ? 'not-allowed' : 'pointer'
              }}
              disabled={busy || (requireTypeToConfirm && typedText !== requireTypeToConfirm)}
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {busy ? 'Working...' : confirmText}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
