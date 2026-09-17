import React from 'react';
import { Link, Navigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, ChevronRight, BookOpen, Compass, ShoppingBag, Package, Boxes, Truck, MapPinned, Tag, BarChart3, Settings, LifeBuoy, LayoutDashboard, Undo2, ArrowLeftRight, FileText, Users } from 'lucide-react';
import { SECTIONS } from '../../help/sections';
import { pagesIn, pageForRoute, pageExists, sectionTitle, sectionBlurb } from '../../help/library';
import { t } from '../../help/ui';

const Icons = { Search, ChevronRight, BookOpen, Compass, ShoppingBag, Package, Boxes, Truck, MapPinned, Tag, BarChart3, Settings, LifeBuoy, LayoutDashboard, Undo2, ArrowLeftRight, FileText, Users };

/** Where a new reader starts, by the job they do. */
const ROLES = [
  { title: 'roleOwner', text: 'roleOwnerText', path: '/help/start/first-day#owner' },
  { title: 'roleSales', text: 'roleSalesText', path: '/help/start/first-day#sales' },
  { title: 'roleStock', text: 'roleStockText', path: '/help/start/first-day#stock-room' },
  { title: 'roleBuying', text: 'roleBuyingText', path: '/help/start/first-day#stock-and-buying' }
];

export default function HelpHome() {
  const { openSearch, lang } = useOutletContext();
  const [params] = useSearchParams();

  // The app's Help button sends /help?from=/shelves/put-away: go straight to that screen's guide.
  const from = params.get('from');
  const forScreen = from && /^\/[^/]/.test(from) ? pageForRoute(from) : null;
  if (forScreen) return <Navigate to={forScreen.path} replace />;

  return (
    <div className="hp-home">
      <Helmet><title>{`ScaleEzy ${t(lang, 'helpCenter')}`}</title></Helmet>
      <section className="hp-hero">
        <h1>{t(lang, 'heroTitle')}</h1>
        <p>{t(lang, 'heroText')}</p>
        <button type="button" className="hp-search-btn" onClick={openSearch} aria-label={t(lang, 'search')}>
          <Search size={19} />
          <span>{t(lang, 'searchHero')}</span>
          <kbd className="hp-kbd">Ctrl K</kbd>
        </button>
      </section>

      {pageExists('/help/start/first-day') && (
        <section aria-labelledby="hp-start">
          <h2 className="hp-h2" id="hp-start">{t(lang, 'startWithJob')}</h2>
          <div className="hp-roles">
            {ROLES.map(r => (
              <Link key={r.title} to={r.path} className="hp-role">
                <strong>{t(lang, r.title)}</strong>
                <span>{t(lang, r.text)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="hp-topics">
        <h2 className="hp-h2" id="hp-topics">{t(lang, 'browseTopics')}</h2>
        <div className="hp-grid">
          {SECTIONS.map(section => {
            const pages = pagesIn(section.id, lang);
            if (!pages.length) return null;
            const Icon = Icons[section.icon] || BookOpen;
            return (
              <div key={section.id} className="hp-card">
                <Link to={pages[0].path} className="hp-card-head">
                  <span className="hp-card-icon"><Icon size={19} /></span>
                  <strong>{sectionTitle(section, lang)}</strong>
                </Link>
                <p>{sectionBlurb(section, lang)}</p>
                <ul>
                  {pages.slice(0, 4).map(p => (
                    <li key={p.slug}><Link to={p.path}><ChevronRight size={14} />{p.title}</Link></li>
                  ))}
                </ul>
                {pages.length > 4 && <Link to={pages[0].path} className="hp-more">{t(lang, 'allGuides', { n: pages.length })}</Link>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
