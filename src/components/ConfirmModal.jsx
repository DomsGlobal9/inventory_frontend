import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

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

  useEffect(() => {
    if (isOpen) {
      setTypedText('');
      setBusy(false);
    }
  }, [isOpen]);
  if (!isOpen) return null;

  /** Nothing dismisses this modal while the action it started is still in flight. */
  const closeIfIdle = () => { if (!busy) onClose(); };

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // The caller's mutation already showed what went wrong. Staying open is deliberate:
      // the person can read the message and press again, instead of the modal disappearing
      // and leaving them unsure whether anything happened.
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px'
        }}
        onClick={(e) => { if (e.target === e.currentTarget) closeIfIdle(); }}
      >
        <motion.div
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
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>{title}</h2>
            <button 
              onClick={closeIfIdle}
              disabled={busy}
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
            <button onClick={closeIfIdle} disabled={busy} className="btn-secondary"
              style={{ opacity: busy ? 0.4 : 1, cursor: busy ? 'not-allowed' : 'pointer' }}>
              Cancel
            </button>
            <button 
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
    </AnimatePresence>
  );
}
