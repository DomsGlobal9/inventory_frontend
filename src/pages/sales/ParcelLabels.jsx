import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import LabelCard, { LABEL_CSS } from '../../components/shipping/LabelCard';

/**
 * Many parcels' labels at once, from Orders → tick → Print labels. `?orders=` the ticked orders,
 * `&paper=label` one 4 × 6 in label per sticker, or `&paper=a4` four to an A4 sheet with cut lines
 * for a shop with an ordinary printer. One label per parcel sent; the orders with nothing sent yet
 * are named at the top of the screen (never printed).
 */
const chunk = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));

export default function ParcelLabels() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ids = (params.get('orders') || '').split(',').filter(Boolean);
  const a4 = params.get('paper') === 'a4';
  const printed = useRef(false);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['parcel-labels', ids.join(',')],
    queryFn: async () => (await api.post('/shipping/labels', { orderIds: ids })).data,
    enabled: ids.length > 0
  });
  const labels = data?.labels ?? [];

  useEffect(() => {
    if (labels.length && params.get('print') === '1' && !printed.current) {
      printed.current = true;
      const t = setTimeout(() => window.print(), 700);
      return () => clearTimeout(t);
    }
  }, [labels.length, params]);

  if (!ids.length) return <div style={{ padding: 48, textAlign: 'center' }}>No orders were chosen. Tick orders on the Orders page, then Print labels.</div>;
  if (isLoading) return <div style={{ padding: 48, textAlign: 'center' }}><Loader2 className="animate-spin" /></div>;
  if (isError) return <div style={{ padding: 48, textAlign: 'center' }}>{error?.message || 'These labels could not be made.'}</div>;

  return (
    <div className="labels-page">
      <style>{`
        .labels-page { min-height: 100vh; background: #f3f4f6; padding: 24px 16px; color: #000; }
        .labels-bar { display: flex; gap: 8px; justify-content: center; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
        .labels-note { max-width: 640px; margin: 0 auto 16px; font-size: 14px; background: #fef3c7; color: #78350f; border-radius: 8px; padding: 10px 14px; text-align: center; }
        .labels-list { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
        .a4-sheet { width: 210mm; height: 297mm; background: #fff; display: grid; grid-template-columns: 105mm 105mm; grid-template-rows: 148.5mm 148.5mm; margin: 0 auto 12px; box-sizing: border-box; }
        .a4-cell { display: flex; align-items: center; justify-content: center; outline: 0.2mm dashed #9ca3af; }
        ${LABEL_CSS}
        @media print {
          @page { size: ${a4 ? 'A4' : '100mm 150mm'}; margin: 0; }
          html, body { background: #fff !important; }
          .labels-page { padding: 0; background: #fff; min-height: 0; }
          .labels-bar, .labels-note { display: none; }
          .labels-list { display: block; }
          .labels-list > .label-paper { border: 0; width: 100mm; height: 150mm; break-after: page; }
          .a4-sheet { margin: 0; break-after: page; }
        }
      `}</style>

      <div className="labels-bar">
        <button className="btn-secondary" onClick={() => navigate('/orders')} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><ArrowLeft size={15} /> Orders</button>
        <button className="btn-primary" disabled={!labels.length} onClick={() => window.print()} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <Printer size={15} /> Print {labels.length} {labels.length === 1 ? 'label' : 'labels'}{a4 ? ` on ${Math.ceil(labels.length / 4)} A4 ${Math.ceil(labels.length / 4) === 1 ? 'sheet' : 'sheets'}` : ''}
        </button>
      </div>
      {data?.notSent?.length > 0 && (
        <div className="labels-note" data-not-sent>
          Not sent yet, so no label: {data.notSent.join(', ')}. Dispatch {data.notSent.length === 1 ? 'it' : 'them'} first.
        </div>
      )}
      {!labels.length && <div style={{ textAlign: 'center' }}>None of the ticked orders has been sent yet.</div>}

      {a4
        ? chunk(labels, 4).map((four, n) => (
          <div key={n} className="a4-sheet">
            {four.map(l => <div key={l.parcel.id} className="a4-cell"><LabelCard data={l} short /></div>)}
          </div>
        ))
        : <div className="labels-list">{labels.map(l => <LabelCard key={l.parcel.id} data={l} />)}</div>}
    </div>
  );
}
