import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, Menu, X, Moon, Sun, ChevronDown, Home, ArrowRight, Languages, Check } from 'lucide-react';
import BrandLockup from '../../components/BrandLockup';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { SECTIONS } from '../../help/sections';
import { pagesIn, sectionTitle, LANGUAGES } from '../../help/library';
import { t } from '../../help/ui';
import HelpSearch from './HelpSearch';
import './help.css';

const LANG_KEY = 'scaleezy_help_lang';

function initialLanguage(params) {
  const wanted = params.get('lang');
  let saved = null;
  try { saved = localStorage.getItem(LANG_KEY); } catch { /* storage unavailable */ }
  const pick = wanted || saved || 'en';
  return LANGUAGES.some(l => l.code === pick) ? pick : 'en';
}

/**
 * The public Help Center at /help. Nobody needs to be signed in to read it; a signed-in person gets
 * "Open the app" instead of "Sign in", and each page's "Open this screen" goes straight there.
 */
export default function HelpLayout() {
  const { isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [params] = useSearchParams();
  const [searchOpen, setSearchOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [lang, setLangState] = useState(() => initialLanguage(params));
  // One section of the menu is open at a time: with 13 sections, several open lists push the rest off the
  // screen. The section of the page being read opens itself.
  const sectionOfPath = (path) => SECTIONS.find(s => path.startsWith(`/help/${s.id}/`))?.id || null;
  const [openSection, setOpenSection] = useState(() => sectionOfPath(location.pathname));
  const scrollRef = useRef(null);

  const setLang = useCallback((code) => {
    setLangState(code);
    try { localStorage.setItem(LANG_KEY, code); } catch { /* storage unavailable */ }
  }, []);

  // Ctrl K / ⌘K / "/" opens search from anywhere in the guide.
  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // A new page starts at its top, and the phone menu closes. (A #part of a page is handled by the page.)
  useEffect(() => {
    setNavOpen(false);
    const section = sectionOfPath(location.pathname);
    if (section) setOpenSection(section);
    if (!location.hash) scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    // sectionOfPath only reads SECTIONS, which never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.hash]);

  const openSearch = useCallback(() => setSearchOpen(true), []);

  return (
    <div className="hp-root" ref={scrollRef} data-help-scroll lang={lang}>
      <Helmet htmlAttributes={{ lang }}>
        <title>{`ScaleEzy ${t(lang, 'helpCenter')}`}</title>
        <meta name="description" content="Step-by-step guides with pictures for every part of ScaleEzy Inventory: selling, stock, purchase orders, racks and shelves, offers and your team." />
      </Helmet>

      <header className="hp-header">
        <button type="button" className="hp-icon-btn hp-menu-btn" aria-label={navOpen ? t(lang, 'closeMenu') : t(lang, 'openMenu')} aria-expanded={navOpen} onClick={() => setNavOpen(o => !o)}>
          {navOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <Link to="/help" className="hp-brand" aria-label={`ScaleEzy ${t(lang, 'helpCenterHome')}`}>
          <BrandLockup width={118} />
          <span className="hp-brand-sep" aria-hidden="true" />
          <span className="hp-brand-label">{t(lang, 'helpCenter')}</span>
        </Link>
        <button type="button" className="hp-search-btn" onClick={openSearch} aria-label={t(lang, 'search')}>
          <Search size={17} />
          <span>{t(lang, 'search')}</span>
          <kbd className="hp-kbd">Ctrl K</kbd>
        </button>
        <div className="hp-header-actions">
          {/* Shown only once a second language has pages. On a phone it lives in the menu instead. */}
          {LANGUAGES.length > 1 && <LanguageMenu lang={lang} setLang={setLang} />}
          <button type="button" className="hp-icon-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? t(lang, 'lightTheme') : t(lang, 'darkTheme')} title={theme === 'dark' ? t(lang, 'lightTheme') : t(lang, 'darkTheme')}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {isAuthenticated
            ? <Link to="/dashboard" className="hp-cta">{t(lang, 'openApp')} <ArrowRight size={15} /></Link>
            : <Link to="/login" className="hp-cta">{t(lang, 'signIn')}</Link>}
        </div>
      </header>

      <div className="hp-shell">
        {navOpen && <div className="hp-nav-scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />}
        <nav className={`hp-nav${navOpen ? ' open' : ''}`} aria-label={t(lang, 'helpCenter')}>
          {LANGUAGES.length > 1 && <LanguageList lang={lang} setLang={setLang} />}
          <NavLink to="/help" end className="hp-nav-home"><Home size={16} /> {t(lang, 'helpCenterHome')}</NavLink>
          {SECTIONS.map(section => (
            <NavGroup
              key={section.id}
              section={section}
              lang={lang}
              open={openSection === section.id}
              onToggle={() => setOpenSection(id => (id === section.id ? null : section.id))}
            />
          ))}
        </nav>
        <main className="hp-main" id="help-main">
          <Outlet context={{ openSearch, lang }} />
        </main>
      </div>

      {searchOpen && <HelpSearch lang={lang} onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

/**
 * Language menu for the top bar: a button with the current language in its own script, opening a list that
 * shows each language in its own script with its English name under it. Keyboard: Enter/Space/↓ opens,
 * ↑ ↓ move, Enter chooses, Esc closes and returns focus to the button.
 */
function LanguageMenu({ lang, setLang }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => Math.max(0, LANGUAGES.findIndex(l => l.code === lang)));
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, LANGUAGES.findIndex(l => l.code === lang)));
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    requestAnimationFrame(() => listRef.current?.focus());
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, lang]);

  const choose = (code) => {
    setLang(code);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onListKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => (i + 1) % LANGUAGES.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => (i - 1 + LANGUAGES.length) % LANGUAGES.length); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(LANGUAGES.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(LANGUAGES[active].code); }
    else if (e.key === 'Escape' || e.key === 'Tab') { setOpen(false); buttonRef.current?.focus(); }
  };

  return (
    <div className="hp-langmenu" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="hp-langmenu-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t(lang, 'language')}: ${current.name}`}
        onClick={() => setOpen(o => !o)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true); } }}
      >
        <Languages size={17} aria-hidden="true" />
        <span lang={current.code}>{current.name}</span>
        <ChevronDown size={15} aria-hidden="true" className="hp-langmenu-chev" />
      </button>
      {open && (
        <ul
          ref={listRef}
          className="hp-langmenu-list"
          role="listbox"
          tabIndex={-1}
          aria-label={t(lang, 'language')}
          aria-activedescendant={`hp-lang-${LANGUAGES[active]?.code}`}
          onKeyDown={onListKey}
        >
          {LANGUAGES.map((l, i) => (
            <li
              key={l.code}
              id={`hp-lang-${l.code}`}
              data-code={l.code}
              role="option"
              aria-selected={l.code === lang}
              className={`hp-langmenu-item${i === active ? ' active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(l.code)}
            >
              <span className="hp-langmenu-names">
                <strong lang={l.code}>{l.name}</strong>
                {l.code !== 'en' && <small>{l.english}</small>}
              </span>
              {l.code === lang && <Check size={16} aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The same choice inside the phone menu: every language as a button, the current one highlighted. */
function LanguageList({ lang, setLang }) {
  return (
    <div className="hp-langlist" role="radiogroup" aria-label={t(lang, 'language')}>
      <p className="hp-langlist-title"><Languages size={14} aria-hidden="true" /> {t(lang, 'language')}</p>
      <div className="hp-langlist-grid">
        {LANGUAGES.map(l => (
          <button
            key={l.code}
            type="button"
            data-code={l.code}
            role="radio"
            aria-checked={l.code === lang}
            className={`hp-langlist-btn${l.code === lang ? ' on' : ''}`}
            onClick={() => setLang(l.code)}
            lang={l.code}
          >
            {l.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function NavGroup({ section, lang, open, onToggle }) {
  const pages = pagesIn(section.id, lang);
  if (pages.length === 0) return null;
  return (
    <div className="hp-nav-group">
      <button type="button" className="hp-nav-group-btn" aria-expanded={open} onClick={onToggle}>
        {sectionTitle(section, lang)}
        <ChevronDown size={15} />
      </button>
      {open && (
        <ul className="hp-nav-list">
          {pages.map(p => (
            <li key={p.slug}><NavLink to={p.path} className={({ isActive }) => (isActive ? 'active' : '')}>{p.title}</NavLink></li>
          ))}
        </ul>
      )}
    </div>
  );
}
