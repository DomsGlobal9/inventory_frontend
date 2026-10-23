import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { usePermission } from '../hooks/usePermission';
import { useAuth } from '../context/AuthContext';
import BrandLockup from '../components/BrandLockup';
import { usePixelPals } from '../components/landing/usePixelPals';

/**
 * WHAT'S NEW: a public page of the landing site (not inside the app): what has been added to ScaleEzy, a
 * card each, by area, with how to start. Linked from the landing page's bar, its plane banner and its
 * "New in ScaleEzy" section.
 *
 * A visitor gets "Try it free" (sign-up). Somebody signed in gets "Open it" for screens their role can open,
 * and who to ask for the rest -- never a button to a "not part of your role" wall. Written from what the
 * screens actually do (checked in the app on 23 Oct), not from what was planned.
 */

// ── Small drawings, one per feature, in the app's own colours (they follow light and dark). ─────────────
const Frame = ({ children }) => (
  <svg viewBox="0 0 240 140" className="wn-art" aria-hidden="true">
    <rect x="1" y="1" width="238" height="138" rx="16" className="wn-art-bg" />
    {children}
  </svg>
);
const ART = {
  dashboard: (
    <Frame>
      <rect x="18" y="18" width="62" height="40" rx="8" className="wn-card" /><rect x="26" y="27" width="30" height="5" rx="2" className="wn-ink2" /><rect x="26" y="38" width="44" height="9" rx="3" className="wn-ink" />
      <rect x="89" y="18" width="62" height="40" rx="8" className="wn-card" /><path d="M96 48 L106 40 L116 44 L128 30 L142 34" className="wn-line" />
      <rect x="160" y="18" width="62" height="40" rx="8" className="wn-card" /><rect x="168" y="27" width="30" height="5" rx="2" className="wn-ink2" /><rect x="168" y="38" width="20" height="9" rx="3" className="wn-warn" />
      <rect x="18" y="68" width="204" height="54" rx="8" className="wn-card" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => { const h = [18, 26, 14, 30, 22, 34, 28, 38, 32][i]; return <g key={i}><rect x={32 + i * 21} y={112 - h} width="12" height={h * 0.6} rx="2" className="wn-deep" /><rect x={32 + i * 21} y={112 - h * 0.4} width="12" height={h * 0.4} rx="2" className="wn-lime" /></g>; })}
    </Frame>
  ),
  card: (
    <Frame>
      <rect x="30" y="18" width="180" height="104" rx="12" className="wn-card" />
      <circle cx="58" cy="46" r="15" className="wn-lime" /><text x="58" y="51" textAnchor="middle" className="wn-initials">RD</text>
      <rect x="82" y="36" width="70" height="7" rx="3" className="wn-ink" /><rect x="82" y="49" width="96" height="5" rx="2" className="wn-ink2" />
      <rect x="44" y="72" width="34" height="14" rx="7" className="wn-chip" /><text x="61" y="82" textAnchor="middle" className="wn-chiptext">L</text>
      {['#2F5DA8', '#B3263A', '#3E9B4F'].map((c, i) => <circle key={c} cx={98 + i * 16} cy="79" r="6" fill={c} />)}
      <rect x="44" y="96" width="150" height="14" rx="5" className="wn-soft" /><rect x="50" y="100" width="70" height="6" rx="3" className="wn-ink2" />
    </Frame>
  ),
  shop: (
    <Frame>
      <rect x="84" y="10" width="72" height="122" rx="12" className="wn-card" /><rect x="110" y="16" width="20" height="4" rx="2" className="wn-ink2" />
      <rect x="92" y="26" width="56" height="52" rx="6" className="wn-soft" /><path d="M106 72 L120 36 L134 72 Z" className="wn-deepfill" />
      <rect x="92" y="84" width="40" height="5" rx="2" className="wn-ink" /><rect x="92" y="94" width="24" height="5" rx="2" className="wn-ink2" />
      <rect x="92" y="108" width="56" height="14" rx="7" className="wn-deep" /><text x="120" y="118" textAnchor="middle" className="wn-btntext">Pay</text>
      <circle cx="52" cy="70" r="16" className="wn-lime" /><path d="M45 70 l5 5 l10 -10" className="wn-tick" />
      <circle cx="190" cy="56" r="12" className="wn-soft" /><text x="190" y="61" textAnchor="middle" className="wn-chiptext">UPI</text>
    </Frame>
  ),
  counter: (
    <Frame>
      <path d="M88 14 h64 v108 l-8 -6 l-8 6 l-8 -6 l-8 6 l-8 -6 l-8 6 l-8 -6 l-8 6 Z" className="wn-card" />
      {[0, 1, 2, 3].map(i => <g key={i}><rect x="98" y={30 + i * 14} width={[30, 24, 34, 20][i]} height="5" rx="2" className="wn-ink2" /><rect x="132" y={30 + i * 14} width="12" height="5" rx="2" className="wn-ink2" /></g>)}
      <rect x="98" y="92" width="46" height="1.5" className="wn-ink2" /><rect x="98" y="98" width="20" height="7" rx="2" className="wn-ink" /><rect x="126" y="98" width="18" height="7" rx="2" className="wn-ink" />
      <rect x="30" y="60" width="40" height="40" rx="8" className="wn-soft" /><path d="M42 80 h16 M50 72 v16" className="wn-tick" />
      <rect x="170" y="60" width="40" height="40" rx="8" className="wn-lime" /><path d="M180 80 l7 7 l13 -14" className="wn-tickdark" />
    </Frame>
  ),
  vouchers: (
    <Frame>
      <path d="M40 34 h160 a6 6 0 0 1 6 6 v14 a12 12 0 0 0 0 24 v14 a6 6 0 0 1 -6 6 h-160 a6 6 0 0 1 -6 -6 v-14 a12 12 0 0 0 0 -24 v-14 a6 6 0 0 1 6 -6 Z" className="wn-deepfill" />
      <rect x="54" y="52" width="60" height="7" rx="3" className="wn-onDeep" /><rect x="54" y="66" width="90" height="14" rx="4" className="wn-onDeep" />
      <path d="M170 56 l4 9 l10 1 l-7 7 l2 10 l-9 -5 l-9 5 l2 -10 l-7 -7 l10 -1 Z" className="wn-lime" />
      {[0, 1, 2].map(i => <circle key={i} cx={70 + i * 18} cy="122" r="8" className="wn-lime" />)}
    </Frame>
  ),
  whatsapp: (
    <Frame>
      <rect x="30" y="22" width="120" height="34" rx="12" className="wn-card" /><rect x="42" y="32" width="70" height="5" rx="2" className="wn-ink2" /><rect x="42" y="42" width="90" height="5" rx="2" className="wn-ink2" />
      <rect x="90" y="66" width="120" height="34" rx="12" className="wn-lime" /><rect x="102" y="76" width="80" height="5" rx="2" className="wn-onLime" /><rect x="102" y="86" width="56" height="5" rx="2" className="wn-onLime" />
      <text x="40" y="120" className="wn-small">🎂</text><rect x="62" y="112" width="70" height="5" rx="2" className="wn-ink2" />
      <rect x="170" y="108" width="40" height="16" rx="8" className="wn-chip" /><text x="190" y="119" textAnchor="middle" className="wn-chiptext">STOP</text>
    </Frame>
  ),
  shelves: (
    <Frame>
      <rect x="50" y="14" width="8" height="114" rx="2" className="wn-ink2" /><rect x="182" y="14" width="8" height="114" rx="2" className="wn-ink2" />
      {[0, 1, 2].map(r => <g key={r}><rect x="50" y={48 + r * 36} width="140" height="6" rx="2" className="wn-ink2" />
        {[0, 1, 2, 3].map(c => <rect key={c} x={64 + c * 30} y={26 + r * 36} width="22" height="22" rx="4" className={r === 1 && c === 2 ? 'wn-lime' : 'wn-soft'} />)}</g>)}
      <path d="M131 30 a11 11 0 1 1 22 0 c0 9 -11 18 -11 18 s-11 -9 -11 -18 Z" className="wn-deepfill" /><circle cx="142" cy="30" r="4" className="wn-onDeep" />
    </Frame>
  ),
  filters: (
    <Frame>
      <rect x="20" y="18" width="200" height="22" rx="11" className="wn-card" /><circle cx="34" cy="29" r="5" className="wn-ink2" /><rect x="46" y="26" width="80" height="6" rx="3" className="wn-ink2" />
      {[['Type', 22, 'wn-chip'], ['Colour', 70, 'wn-lime'], ['Price', 126, 'wn-chip'], ['Stock', 172, 'wn-chip']].map(([t, x, c]) => <g key={t}><rect x={x} y="50" width="44" height="16" rx="8" className={c} /><text x={x + 22} y="61" textAnchor="middle" className="wn-chiptext">{t}</text></g>)}
      {[0, 1, 2, 3].map(i => <g key={i}><rect x={22 + i * 50} y="76" width="44" height="50" rx="7" className="wn-card" /><rect x={28 + i * 50} y="82" width="32" height="26" rx="4" fill={['#2F5DA8', '#1f3f7a', '#3a6fc4', '#22488c'][i]} /><rect x={28 + i * 50} y="114" width="26" height="5" rx="2" className="wn-ink2" /></g>)}
    </Frame>
  )
};

const AREAS = [
  { id: 'all', label: 'Everything' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'customers', label: 'Customers' },
  { id: 'selling', label: 'Selling' },
  { id: 'stock', label: 'Stock and shelves' }
];

const FEATURES = [
  { art: 'dashboard', area: 'dashboard', when: 'Oct 2026', title: 'A dashboard for each store',
    body: 'The stock value of the store you are in with its last 30 days, sales by day and month split between the till and online, top sellers, what suppliers still have to deliver, and what to restock first.',
    steps: ['Pick the store at the top of the screen.', 'The first card is that store\'s stock value; the line shows the last 30 days.', 'Lower down: what is waiting on you, money tied up, stock moves and what to restock.'],
    to: '/dashboard', can: 'dashboard:view' },
  { art: 'filters', area: 'stock', when: 'Oct 2026', title: 'Find products in seconds',
    body: 'Search by name, code, barcode or colour, and filter by type, colour, price, fabric, brand and stock. Each choice shows how many it would leave.',
    steps: ['Open Products and type in the search box, or scan a barcode.', 'Press Colour and pick Blue: the photos show the blue ones.', 'Send the page\'s link to staff: the filters go with it.'],
    to: '/products', can: 'product:view' },
  { art: 'card', area: 'customers', when: 'Oct 2026', title: 'Know a customer as they walk in',
    body: 'Type their number, or they scan the QR at your door. Their sizes, the colours they buy, what they usually spend, what is in the store today in their size and colour, and what others who bought the same pieces went on to buy.',
    steps: ['Open Customers, then Customer card.', 'Type the customer\'s phone number and press Look up.', 'Print the Door QR so customers can check themselves in.'],
    to: '/customers/card', can: 'customer:view' },
  { art: 'vouchers', area: 'customers', when: 'Oct 2026', title: 'Gift vouchers and loyalty points',
    body: 'Sell gift vouchers and give points on what customers buy. Both are spent at the billing counter, and every voucher and point is accounted for.',
    steps: ['Settings, Gift vouchers: switch them on and choose the amounts.', 'Settings, Loyalty and wishes: set how many points a purchase earns.', 'At the billing counter, take a voucher or points as payment.'],
    to: '/settings?section=GIFT_VOUCHERS', can: 'voucher:view' },
  { art: 'shop', area: 'selling', when: 'Oct 2026', title: 'Your own online shop',
    body: 'A shop page for your catalogue that you share as a link. Shoppers pick a colour, see how many are left, and pay online or when it arrives. Orders land in the same Orders list as the counter.',
    steps: ['Settings, Online shop: switch it on and add banners.', 'Settings, Payments: connect your Razorpay account to take payments online.', 'Share your shop\'s link on WhatsApp and Instagram.'],
    to: '/settings?section=ONLINE_SHOP', can: 'admin:online_shop' },
  { art: 'counter', area: 'selling', when: 'Oct 2026', title: 'Billing counter connected',
    body: 'Walk-in bills are made on the ScaleEzy billing counter and update your stock and orders here, returns and exchanges included.',
    steps: ['Settings, POS (billing counter): make a key for the counter.', 'Enter the key once on the billing counter.', 'Bills from the counter appear in Orders, marked Till.'],
    to: '/settings?section=POS', can: 'admin:locations' },
  { art: 'whatsapp', area: 'customers', when: 'Sep 2026', title: 'Offers on WhatsApp',
    body: 'Send an offer to your customers, or a group of them, from your shop\'s own WhatsApp number. Birthday and anniversary wishes go by themselves. Only customers who agreed get messages, a few each day.',
    steps: ['Settings, WhatsApp: link your shop\'s number.', 'Tick "Agrees to offers on WhatsApp" for customers who said yes.', 'Campaigns, New campaign: write the offer and choose who gets it.'],
    to: '/campaigns', can: 'campaign:view' },
  { art: 'shelves', area: 'stock', when: 'Sep 2026', title: 'Find any piece on its shelf',
    body: 'Tell ScaleEzy your racks and shelves and print a label for each. Scan a price tag or type a name to see which shelf it is on, and put away, move, pick and count shelf by shelf.',
    steps: ['Shelves, Racks and shelves: describe each rack.', 'Print the labels and stick one on each shelf.', 'Fill shelves: walk round once and scan what is on each.'],
    to: '/shelves', can: 'shelf:view' }
];

function OpenIt({ f }) {
  const { isAuthenticated } = useAuth();
  const { can } = usePermission();
  if (!isAuthenticated) return <Link to="/signup" className="wn-open">Try it free <ArrowRight size={15} aria-hidden="true" /></Link>;
  if (!can(f.can)) return <span className="wn-noaccess">Ask whoever manages your team to open this for you.</span>;
  return <Link to={f.to} className="wn-open">Open it <ArrowRight size={15} aria-hidden="true" /></Link>;
}

export default function WhatsNew() {
  const [params, setParams] = useSearchParams();
  const area = AREAS.some(a => a.id === params.get('tab')) ? params.get('tab') : 'all';
  const shown = FEATURES.filter(f => area === 'all' || f.area === area);
  const [lead, ...rest] = shown;
  const { isAuthenticated } = useAuth();
  // Two cards, not all: something peeks out from behind them and ducks back.
  const pals = usePixelPals(['lurk', 'kitty']);

  const onTabKey = (e, i) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = AREAS[(i + step + AREAS.length) % AREAS.length];
    setParams(next.id === 'all' ? {} : { tab: next.id }, { replace: true });
    document.getElementById(`wn-tab-${next.id}`)?.focus();
  };

  return (
    // Its own scroller, like the landing page: the app shell keeps html and body from scrolling.
    <div className="wn-public">
      <Helmet>
        <title>What's new · ScaleEzy</title>
        <meta name="description" content="What ScaleEzy added this season: a dashboard per store, the customer card, your own online shop, the billing counter, gift vouchers and points, WhatsApp offers, shelves and product filters." />
      </Helmet>
      <nav className="wn-bar">
        <Link to="/" aria-label="ScaleEzy home" style={{ display: 'flex', textDecoration: 'none' }}><BrandLockup size="md" /></Link>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isAuthenticated
            ? <Link to="/dashboard" className="wn-open">Go to your dashboard <ArrowRight size={15} aria-hidden="true" /></Link>
            : <><Link to="/login" className="wn-barlink">Log in</Link><Link to="/signup" className="wn-open">Get started</Link></>}
        </div>
      </nav>
      <main className="wn">
      <header className="wn-head">
        <span className="wn-badge"><Sparkles size={14} aria-hidden="true" /> New this season</span>
        <h1>What's new in ScaleEzy</h1>
        <p>What we added in September and October. Each card says how to start, and opens the screen it is about.</p>
      </header>

      <div role="tablist" aria-label="Areas" className="wn-tabs">
        {AREAS.map((a, i) => {
          const n = a.id === 'all' ? FEATURES.length : FEATURES.filter(f => f.area === a.id).length;
          return (
            <button key={a.id} id={`wn-tab-${a.id}`} role="tab" type="button" aria-selected={area === a.id} tabIndex={area === a.id ? 0 : -1}
              onClick={() => setParams(a.id === 'all' ? {} : { tab: a.id }, { replace: true })} onKeyDown={(e) => onTabKey(e, i)}>
              {a.label} <span className="wn-count">{n}</span>
            </button>
          );
        })}
      </div>

      {lead && (
        <article className="wn-lead" aria-label={lead.title}>
          <div className="wn-lead-art">{ART[lead.art]}</div>
          <div className="wn-lead-text">
            <span className="wn-when">{lead.when}</span>
            <h2>{lead.title}</h2>
            <p>{lead.body}</p>
            <h3>How to start</h3>
            <ol>{lead.steps.map(s => <li key={s}>{s}</li>)}</ol>
            <OpenIt f={lead} />
          </div>
          {pals && <piix-pal pal="lurk"></piix-pal>}
        </article>
      )}

      {rest.length > 0 && (
        <div className="wn-grid">
          {rest.map((f, i) => (
            <article key={f.title} className="wn-card-box" aria-label={f.title}>
              {pals && i === rest.length - 1 && <piix-pal pal="kitty" do="peek"></piix-pal>}
              {ART[f.art]}
              <span className="wn-when">{f.when}</span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
              <details>
                <summary>How to start</summary>
                <ol>{f.steps.map(s => <li key={s}>{s}</li>)}</ol>
              </details>
              <OpenIt f={f} />
            </article>
          ))}
        </div>
      )}
      <section className="wn-end">
        <h2>{isAuthenticated ? 'All of this is already in your account.' : 'Try all of it on your own shop.'}</h2>
        <p>{isAuthenticated ? 'Open a card above, or go to your dashboard.' : 'Add your products and what is on the shelves. No card, nothing to install.'}</p>
        <Link to={isAuthenticated ? '/dashboard' : '/signup'} className="wn-open">{isAuthenticated ? 'Go to your dashboard' : 'Start for free'} <ArrowRight size={15} aria-hidden="true" /></Link>
        <Link to="/" className="wn-barlink">Back to the ScaleEzy home page</Link>
      </section>
      </main>
    </div>
  );
}
