import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, CornerDownLeft } from 'lucide-react';
import { searchHelp, getPages } from '../../help/library';
import { t } from '../../help/ui';

// Shown before anything is typed; any that do not exist yet are simply skipped.
const SUGGESTED = ['/help/orders/new-sale', '/help/purchase-orders/receive-a-delivery', '/help/shelves/put-away', '/help/settings/add-team-member', '/help/help/common-problems', '/help/start/sign-in'];

/** Search over every guide page, from the keyboard: type, ↑ ↓ to choose, Enter to open, Esc to close. */
export default function HelpSearch({ onClose, lang = 'en' }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const results = useMemo(() => {
    if (query.trim().length < 2) {
      const pages = getPages(lang);
      return SUGGESTED.map(path => pages.find(p => p.path === path)).filter(Boolean).slice(0, 5).map(page => ({ page, heading: null, anchor: null }));
    }
    return searchHelp(query, lang);
  }, [query, lang]);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const open = (r) => {
    if (!r) return;
    navigate(`${r.page.path}${r.anchor ? `#${r.anchor}` : ''}`);
    onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); open(results[active]); }
  };

  return (
    <div className="hp-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="hp-dialog" role="dialog" aria-modal="true" aria-label={t(lang, 'search')}>
        <div className="hp-dialog-input">
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t(lang, 'searchPlaceholder')}
            aria-label={t(lang, 'search')}
            aria-controls="hp-results"
            aria-activedescendant={results[active] ? `hp-r-${active}` : undefined}
            autoComplete="off"
            spellCheck="false"
          />
          <button type="button" className="hp-icon-btn" onClick={onClose} aria-label={t(lang, 'close')}><X size={18} /></button>
        </div>
        {results.length === 0 ? (
          <div className="hp-empty">
            {t(lang, 'nothingMatches')} "<strong>{query}</strong>".<br />
            {t(lang, 'trySimpler')}
          </div>
        ) : (
          <ul className="hp-results" id="hp-results" role="listbox" ref={listRef}>
            {query.trim().length < 2 && <li className="hp-rail-title" style={{ padding: '6px 12px 2px' }} role="presentation">{t(lang, 'popular')}</li>}
            {results.map((r, i) => (
              <li key={`${r.page.path}-${r.anchor ?? ''}`} id={`hp-r-${i}`} role="option" aria-selected={i === active} className="hp-result"
                onMouseEnter={() => setActive(i)} onClick={() => open(r)}>
                <small>{r.page.sectionTitle}</small>
                <strong>{r.page.title}</strong>
                <span>{r.heading ? `→ ${r.heading}` : r.page.summary}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="hp-dialog-foot">
          <span>{t(lang, 'toChoose')}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CornerDownLeft size={12} /> {t(lang, 'toOpen')}</span>
          <span>{t(lang, 'escClose')}</span>
        </div>
      </div>
    </div>
  );
}
