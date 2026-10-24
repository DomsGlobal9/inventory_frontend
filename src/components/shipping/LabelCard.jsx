import React from 'react';
import Barcode from 'react-barcode';

/**
 * One parcel label: the same whether printed alone (pages/sales/ParcelLabel) or many at once
 * (pages/sales/ParcelLabels). 100 × 150 mm; on an A4 sheet four of them, a little shorter.
 * Black on white whatever the app's theme -- it is paper. Data: GET /shipping/dispatches/:id/label
 * or POST /shipping/labels.
 *
 * The barcode is the courier's tracking number when there is one, otherwise the dispatch number.
 * Cash is what is still owed, and only on an order's first parcel (the server decides).
 */
const money = (v) => `₹${Number(v ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const LABEL_CSS = `
  .label-paper { width: 100mm; min-height: 150mm; background: #fff; color: #000; border: 1.5px solid #000;
    font-family: Arial, 'Noto Sans Telugu', 'Noto Sans', sans-serif; box-sizing: border-box; display: flex; flex-direction: column; }
  .label-paper .row { border-bottom: 1.5px solid #000; padding: 3mm 4mm; }
  .label-paper .row:last-child { border-bottom: 0; }
  .label-paper .k { font-size: 8pt; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 1mm; }
  .label-paper .big { font-size: 13pt; font-weight: 700; line-height: 1.25; }
  .label-paper .addr { font-size: 11pt; line-height: 1.3; white-space: pre-line; overflow-wrap: anywhere; }
  .label-paper .small { font-size: 9pt; line-height: 1.3; white-space: pre-line; overflow-wrap: anywhere; }
  .label-paper .split { display: flex; justify-content: space-between; gap: 3mm; align-items: center; }
  .label-paper .cod { border: 2px solid #000; padding: 2mm 3mm; text-align: center; font-size: 10pt; }
  .label-paper .cod b { display: block; font-size: 15pt; }
  .label-paper .bar { text-align: center; }
  .label-paper .bar svg { max-width: 100%; height: auto; }
  .label-paper.short { min-height: 0; height: 140mm; }
  .label-paper.short .row { padding: 2.2mm 3.5mm; }
`;

export default function LabelCard({ data, short = false }) {
  const p = data.parcel;
  const code = p.trackingNumber || p.dispatchNumber;
  const sent = new Date(p.sentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <div className={`label-paper${short ? ' short' : ''}`} data-label={p.dispatchNumber}>
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
        <Barcode value={code} format="CODE128" width={1.6} height={short ? 44 : 52} fontSize={13} margin={0} displayValue />
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
            : data.cashWithParcel
              ? <><b data-cod>NO CASH</b>Collected with {data.cashWithParcel}</>
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
  );
}
