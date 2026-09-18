import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

// Said instead of an empty grey strip when there is nothing to choose. A shop whose catalogue was
// never set up opened Product Category onto nothing at all, with no hint where the choices come from.
const NOTHING_SET_UP = 'Nothing set up yet — add them in Settings → Catalog Configuration.';

export default function Dropdown({ value, onChange, options, placeholder, className = '', emptyText = NOTHING_SET_UP }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => 
    typeof opt === 'string' ? opt === value : opt.value === value
  );
  
  const displayLabel = selectedOption 
    ? (typeof selectedOption === 'string' ? selectedOption : selectedOption.label) 
    : placeholder;

  return (
    <div className={`custom-dropdown ${className}`} ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        className="input-field"
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          textAlign: 'left',
          width: '100%',
          cursor: 'pointer',
          color: value ? 'var(--text-primary)' : 'var(--text-secondary)'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} color="var(--text-secondary)" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              padding: '8px',
              zIndex: 100,
              maxHeight: '250px',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-dropdown)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            {options.length === 0 && (
              <div role="note" style={{ padding: '8px 12px', fontSize: '13px', lineHeight: 1.4, color: 'var(--text-secondary)' }}>
                {emptyText}
              </div>
            )}
            {options.map((opt, i) => {
              const optValue = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              const isSelected = optValue === value;
              
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onChange(optValue);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    background: isSelected ? 'rgba(255,255,255,0.05)' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  {optLabel}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
