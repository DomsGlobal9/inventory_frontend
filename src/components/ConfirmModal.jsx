import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', confirmStyle = 'primary', requireTypeToConfirm = null }) {
  const [typedText, setTypedText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTypedText('');
    }
  }, [isOpen]);
  if (!isOpen) return null;

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
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          style={{
            backgroundColor: 'var(--bg-card)', borderRadius: '12px',
            width: '100%', maxWidth: '400px', border: '1px solid var(--border-light)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column'
          }}
        >
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', position: 'relative', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-warning)' }}>
               <AlertTriangle size={24} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>{title}</h2>
            <button 
              onClick={onClose}
              className="btn-icon"
              style={{ position: 'absolute', top: '20px', right: '20px' }}
            >
              <X size={20} />
            </button>
          </div>
          
          <div style={{ padding: '24px', color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.5' }}>
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
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button 
              onClick={() => {
                onConfirm();
                onClose();
              }} 
              className={confirmStyle === 'danger' ? 'btn-danger' : 'btn-primary'}
              style={{
                ...(confirmStyle === 'danger' ? { backgroundColor: 'var(--accent-warning)', color: '#fff', border: 'none' } : {}),
                opacity: requireTypeToConfirm && typedText !== requireTypeToConfirm ? 0.5 : 1,
                cursor: requireTypeToConfirm && typedText !== requireTypeToConfirm ? 'not-allowed' : 'pointer'
              }}
              disabled={requireTypeToConfirm && typedText !== requireTypeToConfirm}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
