import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
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
  
  .custom-select-trigger.open,
  .custom-select-trigger:focus-visible {
    border-color: var(--border-focus, rgba(255, 255, 255, 0.2));
    box-shadow: 0 0 0 1px var(--border-focus, rgba(255, 255, 255, 0.2));
    outline: none;
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
  
  .custom-select-option:hover:not(.disabled),
  .custom-select-option.active {
    background: var(--bg-hover, rgba(255,255,255,0.05));
    color: var(--text-primary, #fff);
  }

  .custom-select-option.disabled {
    cursor: default;
    opacity: 0.55;
  }
  
  .custom-select-option.selected {
    color: var(--accent-gold, #e2c171);
    background: rgba(226, 193, 113, 0.1);
  }
`;

/** The words of an option, for type-to-jump. Labels can be arrays like ["Main Store", " (", "MS", ")"]. */
const textOf = (label) => React.Children.toArray(label).filter(x => typeof x === 'string' || typeof x === 'number').join('');

/**
 * A dropdown that looks like the app, and behaves like a native <select> for a keyboard and a
 * screen reader.
 *
 * It was mouse-only: the field was a bare div with no tab stop, no role and no keys, so Tab jumped
 * straight past every filter built on it, and an aria-label passed by the caller went nowhere. It
 * now follows the ARIA "select-only combobox" pattern -- focus stays on the field, and the list
 * says which option is highlighted through aria-activedescendant:
 *   closed: Enter, Space or the arrow keys open it on the chosen option;
 *   open:   the arrows, Home and End move, Enter or Space picks, Escape or Tab closes;
 *   either: typing the first letters jumps to the matching option.
 */
export default function Select({
  value, onChange, children, className = '', style, disabled, required, variant = 'default',
  id, title, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [menuBox, setMenuBox] = useState(null);
  // The highlighted option while the list is open -- not chosen yet, as in a native select.
  const [active, setActive] = useState(-1);
  const typed = useRef({ text: '', at: 0 });
  const listId = useId();
  const optionId = (i) => `${listId}-opt-${i}`;
  // Read by the document-level Escape handler, which is attached once.
  const openRef = useRef(false);
  openRef.current = isOpen;

  // Parse standard <option> children into a usable array. Fragments are opened up: a caller that
  // wraps a group of options in <>...</> (Record Stock Movement's reasons, per type) otherwise got
  // an empty list that could not be opened, and a form that then refused for want of a reason.
  const flatten = (nodes) => React.Children.toArray(nodes).flatMap(child =>
    React.isValidElement(child) && child.type === React.Fragment ? flatten(child.props.children) : [child]);
  const options = flatten(children)
    .filter(child => React.isValidElement(child) && child.type === 'option')
    .map(child => ({
      value: child.props.value,
      label: child.props.children,
      // A placeholder such as "Choose..." is disabled so it cannot be chosen back. It used to be
      // clickable here, which quietly un-chose a decision the form then refused.
      disabled: !!child.props.disabled
    }));

  const selectedIndex = options.findIndex(opt => String(opt.value) === String(value));
  const selectedOption = options[selectedIndex] || options[0];

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
      /*
       * How wide the menu is ALLOWED to get.
       *
       * The menu used to be exactly as wide as the field, which is fine until the options are
       * longer than it -- "Supplier Delivery" and "Manual Correction" arrived as "Supplier
       * D..." and "Manual C...", so the list you open to see the choices was the one place
       * you could not read them. The field itself can stay narrow; the menu is floating over
       * the page and costs nothing by being wider.
       *
       * Bounded by the distance to the right edge so a long option cannot push the menu off
       * screen, which would hide the end of it just as effectively.
       */
      maxWidth: Math.max(r.width, window.innerWidth - r.left - MARGIN),
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

  // Keep the highlighted option in sight in a long list (a store's variants, say).
  useEffect(() => {
    if (!isOpen || active < 0) return;
    document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' });
  }, [isOpen, active, menuBox]); // eslint-disable-line react-hooks/exhaustive-deps

  /*
   * A <label htmlFor> names a real form field, but the field here is a div, so the label would name
   * nothing. When the caller gave an id and no name of its own, borrow the label that points at it.
   */
  const [labelledBy, setLabelledBy] = useState(null);
  useEffect(() => {
    if (!id || ariaLabel || ariaLabelledby) return;
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (!label) return;
    if (!label.id) label.id = `${id}-label`;
    setLabelledBy(label.id);
  }, [id, ariaLabel, ariaLabelledby]);

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
    // An open menu takes the Escape, so a dialog it sits in does not close along with it.
    const handleEscape = (event) => {
      if (event.key === 'Escape' && openRef.current) { event.preventDefault(); setIsOpen(false); }
    };
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

  /** The next option that can be chosen, `step` away; stays put at either end. */
  const enabledStep = (from, step) => {
    for (let i = from + step; i >= 0 && i < options.length; i += step) if (!options[i].disabled) return i;
    return from;
  };
  const firstEnabled = () => enabledStep(-1, 1);
  const lastEnabled = () => enabledStep(options.length, -1);

  const open = (at) => {
    if (disabled || options.length === 0) return;
    setActive(at ?? (selectedIndex >= 0 && !options[selectedIndex].disabled ? selectedIndex : firstEnabled()));
    setIsOpen(true);
  };

  /** Typing the start of an option jumps to it; letters typed quickly run together ("ch" for Chanderi). */
  const jumpTo = (key) => {
    const now = Date.now();
    const text = (now - typed.current.at < 700 ? typed.current.text : '') + key.toLowerCase();
    typed.current = { text, at: now };
    const from = isOpen ? active : selectedIndex;
    const order = options.map((_, i) => (from + 1 + i + options.length) % options.length);
    // The same letter pressed again moves on to the next option starting with it.
    const needle = text.split('').every(c => c === text[0]) ? text[0] : text;
    const hit = order.find(i => !options[i].disabled && textOf(options[i].label).trim().toLowerCase().startsWith(needle));
    if (hit === undefined) return;
    if (isOpen) setActive(hit);
    else handleSelect(options[hit].value);
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    const { key } = e;
    const letter = key.length === 1 && key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey;
    if (!isOpen) {
      if (key === 'Enter' || key === ' ' || key === 'ArrowDown' || key === 'ArrowUp') { e.preventDefault(); open(); }
      else if (key === 'Home' || key === 'End') { e.preventDefault(); open(key === 'Home' ? firstEnabled() : lastEnabled()); }
      else if (letter) jumpTo(key);
      return;
    }
    if (key === 'ArrowDown') { e.preventDefault(); setActive(a => enabledStep(a, 1)); }
    else if (key === 'ArrowUp') { e.preventDefault(); setActive(a => enabledStep(a, -1)); }
    else if (key === 'Home') { e.preventDefault(); setActive(firstEnabled()); }
    else if (key === 'End') { e.preventDefault(); setActive(lastEnabled()); }
    else if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      if (options[active] && !options[active].disabled) handleSelect(options[active].value);
      else setIsOpen(false);
    }
    // preventDefault tells a dialog around this field that the Escape was for the menu.
    else if (key === 'Escape') { e.preventDefault(); setIsOpen(false); }
    else if (key === 'Tab') setIsOpen(false);
    else if (letter) jumpTo(key);
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
          id={id}
          role="combobox"
          tabIndex={disabled ? -1 : 0}
          title={title}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabel ? undefined : (ariaLabelledby || labelledBy || undefined)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listId : undefined}
          aria-activedescendant={isOpen && active >= 0 ? optionId(active) : undefined}
          aria-disabled={disabled || undefined}
          aria-required={required || undefined}
          className={`custom-select-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${variant === 'ghost' ? 'ghost' : ''}`}
          onClick={() => { if (disabled) return; if (isOpen) setIsOpen(false); else open(); }}
          onKeyDown={onKeyDown}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedOption ? selectedOption.label : 'Select...'}
          </span>
          <ChevronDown size={16} className="custom-select-icon" />
        </div>
        
        {isOpen && menuBox && createPortal(
          <div
            ref={dropdownRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabel ? undefined : (ariaLabelledby || labelledBy || undefined)}
            // A click in the list must not take focus off the field, or the keyboard is lost.
            onMouseDown={(e) => e.preventDefault()}
            className="custom-select-dropdown open"
            style={{
              left: menuBox.left,
              /*
               * As wide as its longest option, and no wider.
               *
               * Not the field's width. Pinning it to the field was the original bug in one
               * direction -- a narrow field truncated "Supplier Delivery" to "Supplier D..."
               * -- and using the field as a FLOOR is the same mistake in the other: a wide
               * field then gives a mostly empty menu with the words huddled on the left.
               * The menu is floating, so its natural size is the right size.
               *
               * The small floor is so a list of short options ("S", "M", "L") is still a
               * menu-shaped thing to aim at rather than a sliver. The ceiling is the distance
               * to the right edge, so a long label cannot push it off screen.
               */
              minWidth: 120,
              width: 'max-content',
              maxWidth: menuBox.maxWidth,
              maxHeight: menuBox.maxHeight,
              ...(menuBox.openUp ? { bottom: menuBox.bottom } : { top: menuBox.top })
            }}
          >
            {options.map((opt, i) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div
                  key={i}
                  id={optionId(i)}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled || undefined}
                  className={`custom-select-option ${isSelected ? 'selected' : ''} ${i === active ? 'active' : ''} ${opt.disabled ? 'disabled' : ''}`}
                  onMouseEnter={() => { if (!opt.disabled) setActive(i); }}
                  onClick={() => { if (!opt.disabled) handleSelect(opt.value); }}
                >
                  <span style={{ whiteSpace: 'nowrap' }}>
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
          tabIndex={-1}
          aria-hidden="true"
        >
          {children}
        </select>
      </div>
    </>
  );
}
