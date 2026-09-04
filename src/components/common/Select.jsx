import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const styles = `
  .custom-select-container {
    position: relative;
    width: 100%;
    user-select: none;
  }
  
  .custom-select-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: var(--bg-input, #111);
    border: 1px solid var(--border-light, rgba(255, 255, 255, 0.1));
    border-radius: 6px;
    padding: 10px 14px;
    color: var(--text-primary, #fff);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    height: 100%;
    min-height: 40px;
  }
  
  .custom-select-trigger.ghost {
    background: transparent;
    border-color: transparent;
    padding: 4px 8px;
  }
  
  .custom-select-trigger:hover:not(.disabled) {
    border-color: var(--border-focus, rgba(255, 255, 255, 0.2));
  }
  
  .custom-select-trigger.open {
    border-color: var(--border-focus, rgba(255, 255, 255, 0.2));
    box-shadow: 0 0 0 1px var(--border-focus, rgba(255, 255, 255, 0.2));
  }
  
  .custom-select-trigger.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .custom-select-icon {
    color: var(--text-secondary, #a1a1aa);
    transition: transform 0.2s ease;
  }
  
  .custom-select-trigger.open .custom-select-icon {
    transform: rotate(180deg);
  }
  
  .custom-select-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    width: 100%;
    max-height: 250px;
    overflow-y: auto;
    background: var(--bg-card, #0a0a0a);
    border: 1px solid var(--border-light, rgba(255, 255, 255, 0.1));
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05);
    z-index: 9999;
    padding: 4px;
    opacity: 0;
    transform: translateY(-8px);
    pointer-events: none;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  
  .custom-select-dropdown.open {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }
  
  .custom-select-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    margin: 2px 0;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    color: var(--text-secondary, #a1a1aa);
    transition: all 0.15s ease;
  }
  
  .custom-select-option:hover {
    background: var(--bg-hover, rgba(255,255,255,0.05));
    color: var(--text-primary, #fff);
  }
  
  .custom-select-option.selected {
    color: var(--accent-gold, #e2c171);
    background: rgba(226, 193, 113, 0.1);
  }
`;

export default function Select({ value, onChange, children, className = '', style, disabled, required, variant = 'default' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse standard <option> children into a usable array
  const options = React.Children.toArray(children)
    .filter(child => React.isValidElement(child) && child.type === 'option')
    .map(child => ({
      value: child.props.value,
      label: child.props.children
    }));

  const selectedOption = options.find(opt => String(opt.value) === String(value)) || options[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optValue) => {
    if (disabled) return;
    // Provide a mock event object so existing onChange handlers that do e.target.value continue working
    onChange && onChange({ target: { value: optValue } });
    setIsOpen(false);
  };

  const cleanClassName = className.replace(/\b(input-field|input)\b/g, '').trim();

  return (
    <>
      <style>{styles}</style>
      <div 
        ref={containerRef} 
        className={`custom-select-container ${cleanClassName}`} 
        style={style}
      >
        <div 
          className={`custom-select-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${variant === 'ghost' ? 'ghost' : ''}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedOption ? selectedOption.label : 'Select...'}
          </span>
          <ChevronDown size={16} className="custom-select-icon" />
        </div>
        
        <div className={`custom-select-dropdown ${isOpen ? 'open' : ''}`}>
          {options.map((opt, i) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <div 
                key={i} 
                className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelect(opt.value)}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {opt.label}
                </span>
                {isSelected && <Check size={14} />}
              </div>
            );
          })}
        </div>
        
        {/* Hidden native select for form submissions and required validation if used in native forms */}
        <select 
          value={value} 
          onChange={(e) => handleSelect(e.target.value)} 
          disabled={disabled}
          required={required}
          style={{ display: 'none' }}
        >
          {children}
        </select>
      </div>
    </>
  );
}
