import React from 'react';
import { motion } from 'framer-motion';
import { Package, Loader2, Check } from 'lucide-react';
import { formatRupees } from '../utils/money';

const ROTATE_MS = 2600;
/*
 * Past this many colours the dots stop being dots and become a counter. Twelve already wraps to
 * two rows on a narrow card; forty would bury the photograph under its own navigation.
 */
const MAX_DOTS = 12;

/**
 * Somebody who has asked not to be moved is asked once, here, and never again per card.
 */
function usePrefersReducedMotion() {
  const [reduce, setReduce] = React.useState(
    () => typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
  React.useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const onChange = (e) => setReduce(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduce;
}

/**
 * The catalogue as photographs -- one card per PRODUCT, whose colours cycle in place.
 *
 * The first version of this gave every colour its own card, and the arithmetic killed it: eight
 * sarees in three colours each is twenty-four cards to scroll past, three of them near-identical.
 * A card that cycles shows the same twenty-four photographs in eight cards, and the shopkeeper
 * sees the whole catalogue without scrolling through it three times.
 *
 * Clicking any card opens the PRODUCT -- there is no per-variant page, and the product page is
 * where its colours are managed.
 */
export default function ProductGrid({ products, selected, onToggle, onOpen }) {
  const reduceMotion = usePrefersReducedMotion();
  const list = Array.isArray(products) ? products : [];

  return (
    // Laid out in index.css, because the column count changes with the screen and a media
    // query cannot be written as an inline style.
    <div className="product-grid">
      {list.map((product, i) => (
        <ProductCard
          key={product.id ?? i}
          product={product}
          /*
           * Staggered, so a screenful of cards does not all turn over on the same beat. Cards
           * flipping in unison reads as the page reloading; cards flipping at their own moments
           * reads as a shelf being browsed.
           */
          stagger={(i % 5) * 500}
          reduceMotion={reduceMotion}
          isSelected={selected?.has?.(product.id) === true}
          onToggle={onToggle}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

/**
 * The tick on a card, drawn rather than left to the browser.
 *
 * A native checkbox is a small pale square with a hairline border, and it sits here on top of a
 * photograph -- on a cream saree it all but disappears, and on a dark one it is a white blob. It
 * also renders differently on every platform, so the one control a shopkeeper uses to pick out
 * twenty products looked like a rendering fault.
 *
 * The real input is still there, one pixel wide and invisible: it keeps the keyboard, the screen
 * reader and the form semantics, and only its appearance is replaced. The dark disc behind the
 * tick is what makes it legible on any photograph, light or dark.
 */
function SelectBox({ checked, onChange, label }) {
  const [focused, setFocused] = React.useState(false);

  return (
    <label style={{ display: 'inline-flex', cursor: 'pointer', lineHeight: 0 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, margin: 0 }}
      />
      <span
        aria-hidden="true"
        style={{
          width: '22px', height: '22px', borderRadius: '7px',
          display: 'grid', placeItems: 'center',
          background: checked ? 'var(--accent-primary)' : 'rgba(18,22,26,.45)',
          border: checked ? '1.5px solid var(--accent-primary)' : '1.5px solid rgba(255,255,255,.9)',
          // Reads on a white saree as well as a black one; the native control did neither.
          boxShadow: focused
            ? '0 0 0 3px rgba(255,255,255,.55), 0 1px 4px rgba(0,0,0,.45)'
            : '0 1px 4px rgba(0,0,0,.45)',
          backdropFilter: 'blur(2px)',
          transition: 'background .15s ease, border-color .15s ease, box-shadow .15s ease'
        }}
      >
        {checked && <Check size={14} strokeWidth={3.5} color="#fff" />}
      </span>
    </label>
  );
}

function ProductCard({ product, stagger, reduceMotion, isSelected, onToggle, onOpen }) {
  const colours = Array.isArray(product.colours) ? product.colours.filter(Boolean) : [];
  const count = colours.length;

  const [index, setIndex] = React.useState(0);
  const [hovered, setHovered] = React.useState(false);
  /*
   * Once somebody has picked a colour by hand, the card stops moving for good. Resuming the
   * rotation a few seconds later would take away the colour they just chose to look at, which is
   * the one thing a picker must never do.
   */
  const [tookOver, setTookOver] = React.useState(false);
  /*
   * A url that 404s -- a photograph deleted from storage, a bucket made private -- would otherwise
   * leave the browser's torn-page icon sitting in the card. Failures are remembered so that layer
   * is simply not drawn, and the grey panel underneath shows through instead.
   */
  const [broken, setBroken] = React.useState(() => new Set());

  const cover = product.coverImageUrl ?? null;

  /*
   * Every colour's photograph is mounted at once and cross-faded, rather than swapping one img's
   * src. A swap shows the empty box for as long as the next picture takes to arrive, which on a
   * shop's connection is exactly the moment the card looks broken. Mounting them all costs no
   * more bytes than the per-colour grid did -- the same photographs, in fewer cards.
   */
  const layers = count ? colours.map(c => c?.photoUrl ?? cover) : [cover];
  const usable = layers.map((url, i) => (url && !broken.has(i) ? url : null));
  const noPictureAtAll = usable.every(u => !u);

  /*
   * Nothing turns unless there are two different photographs to turn between.
   *
   * A product with no pictures, or whose colours all fall back to the same cover, has a picture
   * that cannot change -- and rotating it anyway leaves a still image with the colour and price
   * flickering underneath, which reads as a fault rather than a feature. Those cards sit quiet
   * and are stepped through by hand; the dots are still there.
   */
  const distinctPhotos = new Set(usable.filter(Boolean)).size;

  /*
   * The rotation steps over holes rather than through them.
   *
   * One colour of three having lost its photograph is an ordinary thing -- somebody deletes a
   * file, somebody adds a colour before the shoot -- and cycling onto it would park the empty
   * state in the middle of a card that plainly has pictures. Those colours are still reachable by
   * their dot, where showing the truth is the point; they are just not rotated onto.
   */
  const showable = usable.map((u, i) => (u ? i : -1)).filter(i => i >= 0);
  const showKey = showable.join(',');
  const showRef = React.useRef(showable);
  showRef.current = showable;

  const rotating = distinctPhotos > 1 && showable.length > 1 && !hovered && !tookOver && !reduceMotion;

  React.useEffect(() => {
    if (!rotating) return;
    let interval;
    const advance = () => setIndex(cur => {
      const order = showRef.current;
      if (!order.length) return cur;
      const at = order.indexOf(cur);
      // Not in the list means somebody picked a colour with no picture; carry on from the start.
      return order[(at + 1) % order.length];
    });
    const kickoff = setTimeout(() => {
      advance();
      interval = setInterval(advance, ROTATE_MS);
    }, stagger);
    return () => { clearTimeout(kickoff); clearInterval(interval); };
  }, [rotating, showKey, stagger]);

  // A colour list that shrinks -- a variant deleted in another tab -- must not leave us pointing
  // past the end, which would blank the card's whole bottom half.
  const safeIndex = count ? Math.min(index, count - 1) : 0;
  const colour = colours[safeIndex] ?? null;

  /*
   * Photographs being made right now.
   *
   * A colour whose four views are still generating has no picture yet, and the card said "No
   * photo" -- exactly what it says about a colour nobody has photographed and never will. The two
   * look identical and mean opposite things: one is a job to do, the other is a job in progress
   * that finishes on its own. Matched on variant id rather than colour name, because the job's
   * colourKey is case-folded on the server and re-deriving that here is how the two drift apart.
   */
  const jobs = Array.isArray(product.generating) ? product.generating : [];
  const job = (colour ? jobs.find(j => (j.variantIds ?? []).includes(colour.id)) : jobs[0]) ?? null;
  const jobText = job
    ? (job.status === 'QUEUED' ? 'Waiting to start…' : `Making photos ${job.viewsDone ?? 0}/${job.viewsTotal ?? 4}`)
    : null;

  const rawUnits = colour ? colour.units : product.variantSummary?.totalUnits;
  const units = Number(rawUnits);
  const knownUnits = Number.isFinite(units);
  const price = colour?.sellingPrice ?? product.basePrice;
  const label = [colour?.colorName, colour?.size].filter(Boolean).join(' · ');

  /*
   * Stock below zero is a real state in this system -- a sale is allowed to take a shelf negative
   * rather than refuse a customer standing at the counter -- so the card has to be able to say
   * so. Printing "-2 in stock" would read as a typo; saying it outright is what sends somebody to
   * go and count.
   */
  const stockText = !knownUnits ? 'Stock unknown'
    : units < 0 ? `${units} · oversold`
      : units === 0 ? 'Out of stock'
        : `${units} in stock`;
  const stockIsBad = !knownUnits || units <= 0;

  const pick = (e, i) => {
    e.stopPropagation();
    setTookOver(true);
    setIndex(i);
  };

  return (
    <motion.div
      layout
      onClick={() => onOpen(product.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      role="button"
      tabIndex={0}
      /*
       * Only a key pressed on the card ITSELF opens the product.
       *
       * The tick box and the colour dots are focusable children, and their keystrokes bubble up
       * here. Without this guard, tabbing to the tick box and pressing space selected the product
       * AND navigated away from the page in the same keystroke, and choosing a colour with the
       * keyboard was impossible -- Enter on a dot left the grid entirely.
       */
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(product.id); }
      }}
      aria-label={`Open ${product.title}`}
      style={{
        cursor: 'pointer',
        borderRadius: '12px',
        overflow: 'hidden',
        background: 'var(--bg-card)',
        border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '3 / 4', background: 'var(--bg-input)' }}>
        {/*
          * The empty state sits UNDER the photographs rather than instead of them, so any hole --
          * a colour with no picture, a url that failed, a photograph still on its way -- shows
          * something deliberate rather than a blank rectangle. A product with no picture cannot
          * go on a storefront and cannot be tried on, and the grid is where that is visible at a
          * glance rather than found one product at a time.
          */}
        {noPictureAtAll && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'grid', placeItems: 'center', gap: '6px', alignContent: 'center'
          }}>
            {job ? (
              <>
                <Loader2 size={24} color="var(--text-muted)" className="animate-spin" />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{jobText}</span>
              </>
            ) : (
              <>
                <Package size={26} color="var(--text-muted)" />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No photo</span>
              </>
            )}
          </div>
        )}

        {usable.map((url, i) => url ? (
          <img
            key={`${i}-${url}`}
            src={url}
            alt=""
            loading="lazy"
            aria-hidden={i !== safeIndex}
            onError={() => setBroken(prev => {
              if (prev.has(i)) return prev;
              const next = new Set(prev);
              next.add(i);
              return next;
            })}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              opacity: i === safeIndex ? 1 : 0,
              transition: reduceMotion ? 'none' : 'opacity .35s ease'
            }}
          />
        ) : null)}

        {/* stopPropagation: the card opens the product, and a tick that navigated away
            would make selecting more than one impossible. */}
        <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '8px', left: '8px' }}>
          <SelectBox
            checked={isSelected}
            onChange={() => onToggle(product.id)}
            label={`Select ${product.title}`}
          />
        </div>

        {/*
          * Stacked, because a product can be a draft AND have its photographs being made -- the
          * usual state for one somebody has just added. Two absolutely positioned badges at the
          * same corner would have sat on top of each other.
          */}
        <div style={{
          position: 'absolute', top: '8px', right: '8px',
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px'
        }}>
          {product.status !== 'ACTIVE' && (
            <span style={{
              padding: '2px 7px', borderRadius: '4px', fontSize: '10px',
              fontWeight: 600, textTransform: 'uppercase',
              background: 'rgba(0,0,0,.6)', color: '#fff'
            }}>{product.status}</span>
          )}
          {/*
            * Said even when a picture IS showing, because that picture is the product cover
            * standing in for a colour that has none yet. Without this the stand-in reads as the
            * finished article and somebody prints a tag against the wrong photograph.
            */}
          {job && !noPictureAtAll && (
            <span style={{
              padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
              background: 'rgba(0,0,0,.6)', color: '#fff', whiteSpace: 'nowrap',
              display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
              <Loader2 size={10} className="animate-spin" /> {jobText}
            </span>
          )}
        </div>

        {count > 1 && count <= MAX_DOTS && (
          <div style={{
            position: 'absolute', bottom: '8px', left: '8px', right: '8px',
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '5px'
          }}>
            {colours.map((c, i) => (
              <button
                key={`${c.id ?? 'c'}-${i}`}
                type="button"
                onClick={(e) => pick(e, i)}
                title={c.colorName || c.variantCode || `Colour ${i + 1}`}
                aria-label={`Show ${c.colorName || c.variantCode || `colour ${i + 1}`}`}
                aria-current={i === safeIndex}
                className="grid-dot"
                style={{
                  width: '7px', height: '7px', padding: 0, borderRadius: '50%', cursor: 'pointer',
                  border: '1px solid rgba(0,0,0,.35)', position: 'relative',
                  background: i === safeIndex ? '#fff' : 'rgba(255,255,255,.45)'
                }}
              />
            ))}
          </div>
        )}

        {/*
          * Beyond a dozen colours the dots would cover the photograph, so the card says where it
          * is in words instead. The product page is where a catalogue that deep gets browsed
          * properly; this only has to stay readable.
          */}
        {count > MAX_DOTS && (
          <span style={{
            position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)',
            padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600,
            background: 'rgba(0,0,0,.6)', color: '#fff', whiteSpace: 'nowrap'
          }}>{safeIndex + 1} / {count} colours</span>
        )}
      </div>

      <div style={{ padding: '10px 12px 12px' }}>
        <p
          title={product.title}
          /*
           * Two lines are always reserved, whether the title needs them or not.
           *
           * Titles here run from "fsa" to a full loom description, and letting the box size
           * itself made cards differ in height by a line. The photographs then sat at different
           * heights down the shelf and the prices stopped lining up across it, which is most of
           * what a photo grid is for.
           */
          style={{
            margin: 0, fontSize: '13px', fontWeight: 500, lineHeight: 1.35,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', wordBreak: 'break-word',
            minHeight: 'calc(13px * 1.35 * 2)'
          }}
        >{product.title}</p>

        {/*
          * The line under the title names the colour on show, so the picture and the words below
          * it are never describing two different things. A fixed height keeps the price and the
          * stock still while the colours change -- text that jumps as the picture turns makes a
          * whole screenful of cards look unstable.
          */}
        <p style={{
          margin: '3px 0 0', fontSize: '11px', color: 'var(--text-secondary)',
          minHeight: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>
          {label || colour?.variantCode || product.productCode}
        </p>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', marginTop: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{formatRupees(price)}</span>
          <span style={{
            fontSize: '11px', whiteSpace: 'nowrap',
            color: stockIsBad ? 'var(--accent-danger)' : 'var(--text-secondary)'
          }}>
            {stockText}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
