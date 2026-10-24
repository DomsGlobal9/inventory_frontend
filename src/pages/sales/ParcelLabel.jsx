import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import LabelCard, { LABEL_CSS } from '../../components/shipping/LabelCard';

/**
 * One parcel's label, 4 × 6 inches (100 × 150 mm): the size of the thermal labels couriers and most
 * label printers use. On an ordinary A4 printer it prints in the top corner.
 *
 * A web page printed by the browser, like the receipt: any printer works, and Telugu names and ₹
 * print properly. Many at once: pages/sales/ParcelLabels.
 */
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

  return (
    <div className="label-page">
      <style>{`
        .label-page { min-height: 100vh; background: #f3f4f6; padding: 24px 16px; color: #000; }
        .label-actions { display: flex; gap: 8px; justify-content: center; margin-bottom: 16px; flex-wrap: wrap; }
        .label-page .label-paper { margin: 0 auto; }
        ${LABEL_CSS}
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

      <LabelCard data={data} />
    </div>
  );
}
