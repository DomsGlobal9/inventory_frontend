import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Clock, Users, ArrowRight, ChevronRight, Languages } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { findPage, neighbours, renderPage, fallbackFor, LANGUAGE_NAMES } from '../../help/library';
import { t } from '../../help/ui';

export default function HelpArticle() {
  const { section, slug } = useParams();
  const { lang } = useOutletContext();
  const page = section && slug ? findPage(section, slug, lang) : null;
  const navigate = useNavigate();
  const { hash } = useLocation();
  const { isAuthenticated } = useAuth();
  const bodyRef = useRef(null);
  const [zoom, setZoom] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const rendered = useMemo(() => (page ? renderPage(page) : null), [page]);

  // The page's HTML is written once per page. React never owns these nodes, so an answer someone opened
  // stays open (with dangerouslySetInnerHTML, a later render put the HTML back and closed it).
  useLayoutEffect(() => {
    if (bodyRef.current && rendered) bodyRef.current.innerHTML = rendered.html;
  }, [rendered]);

  // Links inside the page stay in the app; pictures open large.
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const onClick = (e) => {
      const a = e.target.closest('a[data-internal]');
      if (a && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
        const href = a.getAttribute('href');
        if (href.startsWith('#')) return;
        e.preventDefault();
        navigate(href);
        return;
      }
      const img = e.target.closest('.hp-shot:not(.hp-diagram) img');
      if (img) setZoom({ src: img.currentSrc || img.src, alt: img.alt });
    };
    body.addEventListener('click', onClick);
    return () => body.removeEventListener('click', onClick);
  }, [navigate, rendered]);

  // Arriving with #something (a search result, a link to one common problem): open and show that part.
  useEffect(() => {
    if (!rendered || !hash) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!target) return;
    if (target.tagName === 'DETAILS') {
      target.open = true;
      target.classList.add('hp-flash');
      setTimeout(() => target.classList.remove('hp-flash'), 2200);
    }
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }, [rendered, hash]);

  // Which section is on screen, for "On this page".
  useEffect(() => {
    if (!rendered?.toc.length) return;
    const root = document.querySelector('[data-help-scroll]');
    const headings = rendered.toc.map(item => document.getElementById(item.id)).filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActiveId(visible[0].target.id);
    }, { root, rootMargin: '-72px 0px -65% 0px' });
    headings.forEach(h => observer.observe(h));
    setActiveId(rendered.toc[0].id);
    return () => observer.disconnect();
  }, [rendered]);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e) => { if (e.key === 'Escape') setZoom(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  // Never an error page: an old or mistyped address goes to that topic's first page, or the Help Center home.
  if (!page) return <Navigate to={fallbackFor(section)} replace />;

  const { prev, next } = neighbours(page, lang);
  const screen = page.appLabel || t(lang, 'thisScreen');
  const tryBox = page.app && page.app !== '/login' && (
    <div className="hp-try">
      <strong>{t(lang, 'tryInShop')}</strong>
      <p>{isAuthenticated ? t(lang, 'tryOpens', { screen }) : t(lang, 'trySignIn')}</p>
      <Link to={isAuthenticated ? page.app : '/login'} className="hp-cta">{isAuthenticated ? t(lang, 'openScreen', { screen }) : t(lang, 'signIn')} <ArrowRight size={14} /></Link>
    </div>
  );

  return (
    <div className="hp-article-wrap">
      <Helmet>
        <title>{`${page.title} · ScaleEzy ${t(lang, 'help')}`}</title>
        {page.summary && <meta name="description" content={page.summary} />}
      </Helmet>
      <article lang={page.lang}>
        <nav className="hp-crumbs" aria-label={t(lang, 'help')}>
          <Link to="/help">{t(lang, 'help')}</Link><ChevronRight size={13} /><span>{page.sectionTitle}</span>
        </nav>
        <h1 className="hp-title">{page.title}</h1>
        {page.summary && <p className="hp-lead">{page.summary}</p>}
        <div className="hp-chips">
          {page.minutes ? <span className="hp-chip"><Clock size={13} /> {t(lang, 'minutes', { n: page.minutes })}</span> : null}
          {page.forWho ? <span className="hp-chip"><Users size={13} /> {page.forWho}</span> : null}
        </div>
        {lang !== 'en' && page.lang === 'en' && (
          <p className="hp-untranslated"><Languages size={15} /> {t(lang, 'notTranslated', { language: LANGUAGE_NAMES[lang] || lang })}</p>
        )}
        <div className="hp-try-inline" style={{ display: 'none' }}>{tryBox}</div>
        <div className="hp-body" ref={bodyRef} />
        <nav className="hp-pager" aria-label={t(lang, 'help')}>
          {prev && <Link to={prev.path}><small>{t(lang, 'previous')}</small><span>← {prev.title}</span></Link>}
          {next && <Link to={next.path} className="next"><small>{t(lang, 'next')}</small><span>{next.title} →</span></Link>}
        </nav>
      </article>
      <aside className="hp-rail" aria-label={t(lang, 'onThisPage')}>
        {rendered.toc.length > 1 && (
          <>
            <p className="hp-rail-title">{t(lang, 'onThisPage')}</p>
            <ul className="hp-toc">
              {rendered.toc.map(item => (
                <li key={item.id}><a href={`#${item.id}`} className={item.id === activeId ? 'active' : ''} onClick={(e) => { e.preventDefault(); document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); history.replaceState(null, '', `#${item.id}`); }}>{item.title}</a></li>
              ))}
            </ul>
          </>
        )}
        {tryBox}
      </aside>
      {zoom && (
        <div className="hp-zoom" onClick={() => setZoom(null)} role="dialog" aria-label={t(lang, 'pictureLarger')}>
          <img src={zoom.src} alt={zoom.alt} />
        </div>
      )}
    </div>
  );
}
