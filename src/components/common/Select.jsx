import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
    /* Fixed, and rendered into document.body, rather than absolute inside the field.
       An absolutely-positioned menu is clipped by the nearest scrolling ancestor, and a
       dropdown inside a modal is nearly always inside one. Measured in the return dialog on
       a short window: a seven-option list was squeezed into 84 pixels, about two options at a
       time, because the modal body it sat in was only 127 tall. Its position and height are
       set from JS against the real viewport instead. */
    position: fixed;
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
  const dropdownRef = useRef(null);
  const [menuBox, setMenuBox] = useState(null);

  // Parse standard <option> children into a usable array
  const options = React.Children.toArray(children)
    .filter(child => React.isValidElement(child) && child.type === 'option')
    .map(child => ({
      value: child.props.value,
      label: child.props.children
    }));

  const selectedOption = options.find(opt => String(opt.value) === String(value)) || options[0];

  /**
   * Work out where the menu should sit, in viewport coordinates.
   *
   * Below the field when there is room, above it when there is not, and never taller than the
   * space available. Without the flip, a field near the bottom of the window opens its menu
   * downwards into nothing; without the cap it runs off the screen.
   */
  const positionMenu = useCallback(() => {
    const trigger = containerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const GAP = 4;
    const MARGIN = 8;   // never touch the very edge of the window
    const IDEAL = 250;

    const spaceBelow = window.innerHeight - r.bottom - GAP - MARGIN;
    const spaceAbove = r.top - GAP - MARGIN;
    const openUp = spaceBelow < Math.min(IDEAL, spaceAbove);
    const maxHeight = Math.max(Math.min(IDEAL, openUp ? spaceAbove : spaceBelow), 96);

    setMenuBox({
      left: r.left,
      width: r.width,
      maxHeight,
      openUp,
      top: openUp ? null : r.bottom + GAP,
      bottom: openUp ? window.innerHeight - r.top + GAP : null
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    positionMenu();
    // The field can move out from under the menu: a modal body scrolls, the window resizes,
    // the page behind scrolls. Capture phase, so scrolls inside any container are caught and
    // not just those on window.
    const onMove = () => positionMenu();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [isOpen, positionMenu]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // The menu is portalled out of this component's DOM, so containerRef no longer contains
      // it. Without this first check, clicking an option counted as clicking outside and shut
      // the menu before the choice could register.
      if (dropdownRef.current && dropdownRef.current.contains(event.target)) return;
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event) => { if (event.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
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
        
        {isOpen && menuBox && createPortal(
          <div
            ref={dropdownRef}
            className="custom-select-dropdown open"
            style={{
              left: menuBox.left,
              width: menuBox.width,
              maxHeight: menuBox.maxHeight,
              ...(menuBox.openUp ? { bottom: menuBox.bottom } : { top: menuBox.top })
            }}
          >
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
          </div>,
          document.body
        )}
        
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
