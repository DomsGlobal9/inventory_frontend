import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Barcode from 'react-barcode';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

/**
 * The label stuck on the parcel box: 4 × 6 inches (100 × 150 mm), the size of the thermal labels
 * couriers and most label printers use. On an ordinary A4 printer it prints in the top corner.
 *
 * A web page printed by the browser, like the receipt: any printer works, and Telugu names and ₹
 * print properly. Black on white whatever the app's theme -- it is paper.
 *
 * The barcode is the courier's tracking number when there is one, otherwise the dispatch number.
 * Cash to collect is what is still owed on the order, never the total: somebody who paid in advance
 * is not asked again at the door. Server: GET /shipping/dispatches/:id/label.
 */
const money = (v) => `₹${Number(v ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function ParcelLabel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const printed = useRef(false);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['parcel-label', id],
    queryFn: async () => (await api.get(`/shipping/dispatches/${id}/label`)).data
  });

  useEffect(() => {
    if (data && params.get('print') === '1' && !printed.current) {
      printed.current = true;
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [data, params]);

  if (isLoading) return <div style={{ padding: 48, textAlign: 'center' }}><Loader2 className="animate-spin" /></div>;
  if (isError || !data) return <div style={{ padding: 48, textAlign: 'center' }}>{error?.message || 'This label could not be made.'}</div>;

  const p = data.parcel;
  const code = p.trackingNumber || p.dispatchNumber;
  const sent = new Date(p.sentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="label-page">
      <style>{`
        .label-page { min-height: 100vh; background: #f3f4f6; padding: 24px 16px; color: #000; }
        .label-actions { display: flex; gap: 8px; justify-content: center; margin-bottom: 16px; flex-wrap: wrap; }
        .label-paper { width: 100mm; min-height: 150mm; margin: 0 auto; background: #fff; color: #000; border: 1.5px solid #000;
          font-family: Arial, 'Noto Sans Telugu', 'Noto Sans', sans-serif; box-sizing: border-box; display: flex; flex-direction: column; }
        .label-paper .row { border-bottom: 1.5px solid #000; padding: 3mm 4mm; }
        .label-paper .row:last-child { border-bottom: 0; }
        .label-paper .k { font-size: 8pt; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 1mm; }
        .label-paper .big { font-size: 13pt; font-weight: 700; line-height: 1.25; }
        .label-paper .addr { font-size: 11pt; line-height: 1.3; white-space: pre-line; overflow-wrap: anywhere; }
        .label-paper .small { font-size: 9pt; line-height: 1.3; white-space: pre-line; overflow-wrap: anywhere; }
        .label-paper .split { display: flex; justify-content: space-between; gap: 3mm; align-items: center; }
        .label-paper .cod { border: 2px solid #000; padding: 2mm 3mm; text-align: center; }
        .label-paper .cod b { display: block; font-size: 15pt; }
        .label-paper .bar { text-align: center; }
        .label-paper .bar svg { max-width: 100%; height: auto; }
        @media print {
          @page { size: 100mm 150mm; margin: 0; }
          html, body { background: #fff !important; }
          .label-page { padding: 0; background: #fff; min-height: 0; }
          .label-actions { display: none; }
          .label-paper { border: 0; width: 100mm; height: 150mm; }
        }
      `}</style>

      <div className="label-actions">
        <button className="btn-secondary" onClick={() => navigate(-1)} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><ArrowLeft size={15} /> Back</button>
        <button className="btn-primary" onClick={() => window.print()} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Printer size={15} /> Print label</button>
      </div>

      <div className="label-paper" data-label={p.dispatchNumber}>
        <div className="row split">
          <div>
            <div className="k">Courier</div>
            <div className="big">{p.courierName || 'Hand delivery'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="k">Date</div>
            <div className="small">{sent}</div>
          </div>
        </div>

        <div className="row bar">
          <Barcode value={code} format="CODE128" width={1.6} height={52} fontSize={13} margin={0} displayValue />
          <div className="small">{p.trackingNumber ? 'Tracking number' : 'Dispatch number'}</div>
        </div>

        <div className="row">
          <div className="k">Deliver to</div>
          <div className="big">{data.to.name || 'Customer'}</div>
          {data.to.address && <div className="addr">{data.to.address}</div>}
          {data.to.phone && <div className="big" style={{ marginTop: '1mm' }}>Ph: {data.to.phone}</div>}
          {!data.to.address && <div className="small" style={{ marginTop: '1mm' }}>No address on this order: write it by hand.</div>}
        </div>

        <div className="row split">
          <div className="cod" style={{ flex: 1 }}>
            {data.cashToCollect > 0
              ? <>Cash on delivery<b data-cod>{money(data.cashToCollect)}</b>Collect from customer</>
              : <><b data-cod>PREPAID</b>Do not collect money</>}
          </div>
          <div style={{ flex: 1 }}>
            <div className="k">Order</div>
            <div className="big">{data.orderNumber}</div>
            <div className="small">{p.dispatchNumber} · {p.pieces} {p.pieces === 1 ? 'piece' : 'pieces'}</div>
          </div>
        </div>

        <div className="row" style={{ flex: 1 }}>
          <div className="k">From (return here if not delivered)</div>
          <div className="small" style={{ fontWeight: 700 }}>{data.from.name || ''}</div>
          {data.from.address && <div className="small">{data.from.address}</div>}
          {data.from.phone && <div className="small">Ph: {data.from.phone}</div>}
        </div>
      </div>
    </div>
  );
}
