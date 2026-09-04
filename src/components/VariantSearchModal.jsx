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

export default function VariantSearchModal({ isOpen, onClose, onSelect, supplierId, supplierName }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // What this supplier actually sells. Until this existed the picker searched the whole
  // catalogue with nothing to say which items the vendor stocks, so raising an order meant
  // remembering it -- and nothing stopped you ordering a saree from a button merchant.
  const [supplierCatalogue, setSupplierCatalogue] = useState([]);
  const [isLoadingCatalogue, setIsLoadingCatalogue] = useState(false);

  // Keyed by variant id so a search result can be marked as stocked by this supplier, and
  // their agreed price used instead of a cross-supplier average.
  const supplierTerms = new Map(supplierCatalogue.map(link => [link.variant.id, link]));

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSupplierCatalogue([]);
    }
  }, [isOpen]);

  // Loaded once when the picker opens. Showing the supplier's own items before anything is
  // typed is the point: the common case is "what do I order from them", not "find this SKU".
  useEffect(() => {
    let ignore = false;
    async function loadCatalogue() {
      if (!isOpen || !supplierId) return;
      setIsLoadingCatalogue(true);
      try {
        const res = await api.get(`/suppliers/${supplierId}/products`);
        if (!ignore) setSupplierCatalogue(res.data || []);
      } catch (err) {
        // A missing catalogue must not block ordering -- fall back to plain search.
        if (!ignore) console.error('Could not load supplier catalogue:', err);
      } finally {
        if (!ignore) setIsLoadingCatalogue(false);
      }
    }
    loadCatalogue();
    return () => { ignore = true; };
  }, [isOpen, supplierId]);

  useEffect(() => {
    let ignore = false;
    
    async function search() {
      if (!debouncedQuery) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await api.get('/variants/search', {
          params: { q: debouncedQuery, page: 1, limit: 20 }
        });
        if (!ignore) {
          setResults(res.data?.items || []);
        }
      } catch (err) {
        if (!ignore) console.error("Search failed:", err);
      } finally {
        if (!ignore) setIsSearching(false);
      }
    }
    
    if (isOpen) {
      search();
    }
    
    return () => {
      ignore = true;
    };
  }, [debouncedQuery, isOpen]);

  // With no query, show the supplier's catalogue mapped into the same shape a search result
  // has, so one render path serves both. Falls back to nothing when there is no supplier.
  const catalogueAsResults = supplierCatalogue.map(link => ({
    id: link.variant.id,
    sku: link.variant.sku,
    barcode: link.variant.barcode,
    variantCode: link.variant.sku,
    productTitle: link.variant.product?.title,
    color: link.variant.colorName,
    size: link.variant.size,
    stock: (link.variant.stocks || []).reduce((sum, s) => sum + (s.quantity || 0), 0),
    reorderLevel: link.variant.reorderLevel ?? 0,
    reorderQty: link.variant.reorderQty,
    lastPurchaseCost: link.costPrice != null ? Number(link.costPrice) : null,
    costPrice: link.variant.averageCost != null ? Number(link.variant.averageCost) : null
  }));

  const showingCatalogue = !debouncedQuery && supplierId;
  const visible = showingCatalogue ? catalogueAsResults : results;
  const busy = showingCatalogue ? isLoadingCatalogue : isSearching;

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
            boxShadow: 'var(--shadow-modal)', display: 'flex', flexDirection: 'column',
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
            
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: supplierName ? '4px' : '16px' }}>Add Item to PO</h2>
            {supplierName && (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                {showingCatalogue
                  ? `Items supplied by ${supplierName}. Search to order something else.`
                  : `Searching all products — items ${supplierName} supplies are marked.`}
              </p>
            )}
            
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
            {busy && (
              <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <Loader2 size={24} className="animate-spin" />
              </div>
            )}
            
            {!busy && debouncedQuery && results.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No variants found for "{debouncedQuery}"
              </div>
            )}

            {!busy && showingCatalogue && catalogueAsResults.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6 }}>
                No items are linked to {supplierName} yet.<br />
                Search for a product to add it — it will be linked to this supplier automatically.
              </div>
            )}
            
            {!busy && visible.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {visible.map((variant) => (
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
                      
                      // This supplier's agreed price wins over lastPurchaseCost, which is
                      // whatever the most recent receipt cost from ANY supplier and is
                      // therefore the wrong number the moment you buy from two of them.
                      const link = supplierTerms.get(variant.id);
                      const defaultCost =
                        (link?.costPrice != null ? Number(link.costPrice) : null)
                        ?? variant.lastPurchaseCost
                        ?? variant.costPrice
                        ?? 0;

                      // A supplier's minimum order quantity is a hard floor -- ordering under
                      // it gets the order rejected or silently rounded up at their end.
                      if (link?.minOrderQty && defaultQty < link.minOrderQty) {
                        defaultQty = link.minOrderQty;
                      }
                      
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
                        {supplierTerms.get(variant.id)?.supplierSku && (
                          <> | their code: {supplierTerms.get(variant.id).supplierSku}</>
                        )}
                      </p>
                      {/* Only shown while searching the whole catalogue -- inside the
                          supplier's own list every row is theirs, so a badge on all of them
                          would be noise. The warning is the useful half: it catches ordering
                          something this vendor has never supplied. */}
                      {!showingCatalogue && supplierId && (
                        supplierTerms.has(variant.id) ? (
                          <span style={{ display: 'inline-block', marginTop: '6px', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', color: 'var(--accent-success)', background: 'rgba(16, 185, 129, 0.12)' }}>
                            SUPPLIED BY {(supplierName || 'THIS SUPPLIER').toUpperCase()}
                          </span>
                        ) : (
                          <span style={{ display: 'inline-block', marginTop: '6px', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', color: 'var(--accent-warning)', background: 'rgba(245, 158, 11, 0.12)' }}>
                            NOT LINKED TO THIS SUPPLIER
                          </span>
                        )
                      )}
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
