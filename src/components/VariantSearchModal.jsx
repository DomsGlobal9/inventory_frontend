import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Package, Check, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

// Simple debounce helper
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function VariantSearchModal({ isOpen, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    async function search() {
      if (!debouncedQuery) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await api.get(`/variants/search?q=${debouncedQuery}&page=1&limit=20`);
        setResults(res.data?.items || []);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }
    
    if (isOpen) {
      search();
    }
  }, [debouncedQuery, isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '80px 16px'
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          style={{
            backgroundColor: 'var(--bg-card)', borderRadius: '12px',
            width: '100%', maxWidth: '600px', border: '1px solid var(--border-light)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column',
            maxHeight: '70vh'
          }}
        >
          {/* Header */}
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', position: 'relative' }}>
            <button 
              onClick={onClose}
              className="btn-icon"
              style={{ position: 'absolute', top: '24px', right: '24px' }}
            >
              <X size={20} />
            </button>
            
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Add Item to PO</h2>
            
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                autoFocus
                type="text"
                className="input-field"
                style={{ paddingLeft: '40px', fontSize: '16px' }}
                placeholder="Search variant by SKU, barcode, title..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Results Area */}
          <div style={{ padding: '0', overflowY: 'auto', flex: 1 }}>
            {isSearching && (
              <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <Loader2 size={24} className="spin" />
              </div>
            )}
            
            {!isSearching && debouncedQuery && results.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No variants found for "{debouncedQuery}"
              </div>
            )}
            
            {!isSearching && results.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {results.map((variant) => (
                  <div 
                    key={variant.id}
                    style={{ 
                      padding: '16px 24px', 
                      borderBottom: '1px solid var(--border-light)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => {
                      // Smart defaults logic
                      let defaultQty = 1;
                      if (variant.reorderQty && variant.reorderQty > 0) {
                        defaultQty = variant.reorderQty;
                      } else {
                        defaultQty = Math.max(variant.reorderLevel - variant.stock, 1);
                      }
                      
                      const defaultCost = variant.lastPurchaseCost || variant.costPrice || 0;
                      
                      onSelect({
                        ...variant,
                        orderedQty: defaultQty,
                        unitPrice: defaultCost
                      });
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '500', color: 'var(--text-primary)' }}>
                        {variant.productTitle} {variant.color && `(${variant.color})`} {variant.size && `[${variant.size}]`}
                      </h4>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {variant.sku} | {variant.barcode || variant.variantCode}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: variant.isLowStock ? 'var(--accent-warning)' : 'var(--text-primary)' }}>
                        Stock: {variant.stock}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Reorder: {variant.reorderLevel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
