import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Check, ArrowLeft, CheckCircle, Images } from 'lucide-react';
import { useProduct } from '../context/ProductContext';
import { useCatalogData } from '../hooks/useCatalogConfig';
import { colorInfoFor } from '../utils/colorOptions';
import GarmentPhotoshootUploader from '../components/GarmentPhotoshootUploader';

/**
 * Photographs, one colour at a time.
 *
 * This step used to take ONE set of photographs for the whole product. A shop selling the
 * same saree in five colours photographed one of them, and the other four went online
 * wearing a picture of a colour the customer would not receive -- with nothing anywhere on
 * the screen admitting it.
 *
 * Now each colour is its own card. Pick a colour, photograph it, move on. The card says
 * what that colour has, so "which ones still need a photo" is answered by looking rather
 * than by remembering.
 *
 * Nothing here is compulsory. Colours can be left empty and published, and photographed
 * later from the product's own Photos tab -- an unphotographed colour is a job for later,
 * not a locked door.
 */

/** How many photographs one colour is holding, counting what was uploaded and what was made. */
function countPhotos(photos) {
  const source = photos?.sourceFiles;
  const slots = Array.isArray(source)
    ? source.filter(Boolean).length
    : Object.values(source || {}).filter(Boolean).length;
  // The shop's own extra photographs count too -- a colour photographed six times by hand and
  // never run through the generator is a colour WITH photos, and saying "No photos yet" next
  // to six of them is the screen calling the shopkeeper a liar.
  const extras = (photos?.extraFiles || []).filter(Boolean).length;
  const generated = Object.values(photos?.generatedViews || {}).filter(v => typeof v === 'string' && v.startsWith('data:')).length;
  const uploaded = slots + extras;
  return { uploaded, generated, total: uploaded + generated };
}

/**
 * One colour's card.
 *
 * A button rather than a div with an onClick, so it is reachable by keyboard and announces
 * itself -- this is the only way to reach a colour's photographs, and a list of colours
 * only a mouse can open is a list half the people cannot use.
 */
function ColourCard({ info, counts, selected, onPick }) {
  const done = counts.total > 0;
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
        borderRadius: '12px', cursor: 'pointer', textAlign: 'left', minWidth: 0,
        background: selected ? 'var(--bg-hover)' : 'var(--bg-card)',
        border: `1px solid ${selected ? 'var(--accent-gold)' : 'var(--border-light)'}`,
        // The selected card is the one being worked on, so it carries the only shadow --
        // outlining every card in gold made the row read as five selected things at once.
        boxShadow: selected ? '0 0 0 1px var(--accent-gold)' : 'none',
        transition: 'background-color 0.14s, border-color 0.14s'
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
          background: info.value,
          // A white or cream saree on a white card is an invisible swatch, so every swatch
          // carries its own hairline regardless of how pale it is.
          border: '1px solid rgba(0,0,0,0.18)'
        }}
      />
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px', overflowWrap: 'anywhere' }}>
          {info.name}
        </span>
        <span style={{ fontSize: '12px', color: done ? 'var(--accent-success)' : 'var(--text-muted)' }}>
          {done
            ? `${counts.total} photo${counts.total === 1 ? '' : 's'}`
            : 'No photos yet'}
        </span>
      </span>
      {done && <Check size={16} style={{ color: 'var(--accent-success)', flexShrink: 0, marginLeft: 'auto' }} />}
    </button>
  );
}

export default function UploadPhotos() {
  const navigate = useNavigate();
  const { productData, photosFor } = useProduct();
  const { colors } = useCatalogData();

  const codes = productData.selectedColors || [];

  /*
   * A product with no colours still gets one set of photographs, under the empty key. The
   * wizard does not force a colour to be chosen, so without this the whole step would
   * simply not appear and the product would have no way to get a picture at all.
   */
  const colourList = useMemo(() => (
    codes.length > 0
      ? codes.map(code => ({ code, info: colorInfoFor(code, colors) }))
      : [{ code: '', info: { name: 'This product', value: 'var(--border-light)' } }]
  ), [codes, colors]);

  const [picked, setPicked] = useState(() => colourList[0]?.code ?? '');
  // A colour removed on the previous step while this one was open would otherwise leave the
  // uploader pointed at a colour that no longer exists.
  const current = colourList.find(c => c.code === picked) ?? colourList[0];

  const withPhotos = colourList.filter(c => countPhotos(photosFor(c.code)).total > 0).length;
  const showColourRow = colourList.length > 1;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <button
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', paddingLeft: 0 }}
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} />
          BACK
        </button>
      </div>

      {showColourRow && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={18} style={{ color: 'var(--accent-gold)' }} />
                Photos, colour by colour
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                Pick a colour and photograph it. You can leave any of them for later.
              </p>
            </div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              {withPhotos} of {colourList.length} done
            </span>
          </div>

          <div
            role="group"
            aria-label="Choose a colour to photograph"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '10px' }}
          >
            {colourList.map(({ code, info }) => (
              <ColourCard
                key={code}
                info={info}
                counts={countPhotos(photosFor(code))}
                selected={code === current.code}
                onPick={() => setPicked(code)}
              />
            ))}
          </div>
        </div>
      )}

      {/*
        Keyed by colour so switching colour starts the uploader again rather than carrying
        the previous colour's slots, previews and half-finished generation across. Without
        the key, picking blue after red showed red's flat-lay sitting in blue's slot.
      */}
      <GarmentPhotoshootUploader
        key={current.code || '__only__'}
        colorCode={current.code}
        colorLabel={showColourRow ? current.info.name : undefined}
        onGenerationComplete={() => {}}
      />

      <div className="mobile-sticky-footer"
        style={{
          borderTop: '1px solid var(--border-light)',
          paddingTop: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        {/*
          Said out loud rather than enforced. A shop that wants the other four colours
          photographed next week must be able to publish today -- so this is a reminder of
          what is still open, never a reason the button is grey.
        */}
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <Images size={15} style={{ color: 'var(--text-muted)' }} />
          {withPhotos === colourList.length
            ? 'Every colour has a photo.'
            : withPhotos === 0
              ? 'No photos yet — you can add them any time from the product.'
              : `${colourList.length - withPhotos} colour${colourList.length - withPhotos === 1 ? '' : 's'} still without a photo — you can add them later.`}
        </span>
        <button
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => navigate('/preview')}
        >
          REVIEW &amp; PUBLISH PRODUCT
          <CheckCircle size={16} />
        </button>
      </div>
    </div>
  );
}
