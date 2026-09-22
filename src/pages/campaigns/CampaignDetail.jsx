import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Square, Copy, Pencil, Trash2, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useCampaign, useCampaignOverview, useAudiencePreview, useUpdateCampaign, useDeleteCampaign, useCopyCampaign,
  useStartCampaign, useCampaignAction, useSendCampaignTest
} from '../../hooks/useCampaigns';
import { useBranding } from '../../hooks/useBranding';
import { usePermission } from '../../hooks/usePermission';
import PageLoader from '../../components/PageLoader';
import LoadFailed from '../../components/LoadFailed';
import ConfirmModal from '../../components/ConfirmModal';
import CampaignEditor from '../../components/campaigns/CampaignEditor';
import MessageBubble from '../../components/campaigns/MessageBubble';
import TestSend from '../../components/campaigns/TestSend';
import { StatusPill, Progress } from './Campaigns';
import { renderCampaign, howLong, RECIPIENT_LABEL, SOURCE_LABEL } from '../../utils/campaignText';

/**
 * One campaign. A draft can be changed, tested and started; once started its words and customers
 * are fixed, and the page shows who has it, who has read it, and who was skipped and why.
 */

const RECIPIENT_TONE = {
  READ: 'rgb(21,128,61)', DELIVERED: 'rgb(21,128,61)', SENT: 'rgb(22,101,52)',
  FAILED: 'rgb(185,28,28)', EXPIRED: 'rgb(185,28,28)', SKIPPED: 'rgb(107,114,128)'
};

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermission();
  const { data: c, isLoading, error, refetch } = useCampaign(id);
  const overview = useCampaignOverview();
  const { data: branding } = useBranding();
  const draft = c?.status === 'DRAFT';
  const reach = useAudiencePreview(c?.audience ?? {}, { enabled: !!draft });
  const update = useUpdateCampaign();
  const del = useDeleteCampaign();
  const copy = useCopyCampaign();
  const start = useStartCampaign();
  const act = useCampaignAction();
  const test = useSendCampaignTest();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(null);   // 'start' | 'cancel' | 'delete'

  if (isLoading) return <PageLoader text="LOADING CAMPAIGN..." />;
  if (error || !c) return <LoadFailed what="this campaign" error={error} onRetry={refetch} />;

  const mayAct = can('campaign:send');
  const perDay = overview.data?.perDay ?? 20;
  const linked = overview.data?.whatsapp?.status === 'CONNECTED';
  const count = reach.data?.count ?? 0;
  const run = async (fn, ok) => { try { await fn(); if (ok) toast.success(ok); } catch (e) { toast.error(e?.message || 'That did not work. Try again.'); } };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingTop: '24px', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '64px', width: '100%' }}>
      <Link to="/campaigns" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', marginBottom: '12px' }}>
        <ArrowLeft size={16} /> Campaigns
      </Link>

      <div className="mobile-col" style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: '28px', margin: 0, color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>{c.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
            <StatusPill status={c.status} />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {c.source !== 'MANUAL' ? `${SOURCE_LABEL[c.source] ?? c.source} · ` : ''}{c.audienceText}
            </span>
          </div>
        </div>
        {mayAct && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {draft && <>
              <button className="btn-secondary" onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Pencil size={15} /> Change</button>
              <button className="btn-secondary" onClick={() => setConfirm('delete')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Trash2 size={15} /> Delete</button>
              <button className="btn-primary" disabled={!count || reach.isFetching} onClick={() => setConfirm('start')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Play size={15} /> Start</button>
            </>}
            {c.status === 'SENDING' && <button className="btn-secondary" disabled={act.isPending} onClick={() => run(() => act.mutateAsync({ id, action: 'pause' }), 'Paused. Nothing more goes until you carry on.')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Pause size={15} /> Pause</button>}
            {c.status === 'PAUSED' && <button className="btn-primary" disabled={act.isPending} onClick={() => run(() => act.mutateAsync({ id, action: 'resume' }), 'Carrying on.')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Play size={15} /> Carry on</button>}
            {(c.status === 'SENDING' || c.status === 'PAUSED') && <button className="btn-secondary" onClick={() => setConfirm('cancel')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Square size={15} /> Stop</button>}
            {c.source === 'MANUAL' && !draft && <button className="btn-secondary" disabled={copy.isPending}
              onClick={() => run(async () => { const made = await copy.mutateAsync(id); navigate(`/campaigns/${made.id}`); }, 'Copied into a new draft.')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Copy size={15} /> Copy</button>}
          </div>
        )}
      </div>

      <div className="mobile-col" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div className="card" style={{ flex: 1, padding: '16px', minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>The message</div>
          <MessageBubble text={renderCampaign(c.text, {
            name: reach.data?.sample?.[0]?.name ?? c.recipients?.[0]?.name ?? 'Lakshmi',
            shop: branding?.businessName,
            points: reach.data?.sample?.[0]?.loyaltyPoints ?? 250,
            pointsValue: `₹${(reach.data?.sample?.[0]?.loyaltyPoints ?? 250).toLocaleString('en-IN')}`
          })} />
          {draft && mayAct && <div style={{ marginTop: '12px', maxWidth: '320px' }}><TestSend campaignId={id} /></div>}
        </div>
        <div className="card" style={{ width: '320px', maxWidth: '100%', padding: '16px' }}>
          {draft ? (
            <>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Who gets it</div>
              <div style={{ fontSize: '28px', fontWeight: 600 }}>{reach.isFetching && !reach.data ? '…' : count.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>customer{count === 1 ? '' : 's'} right now</div>
              {count > 0 && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '10px 0 0' }}>
                At up to {perDay} a day between 10 am and 8 pm, this {howLong(count, perDay)}.
              </p>}
              {count === 0 && !reach.isFetching && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '10px 0 0' }}>
                Nobody matches yet. Only customers who agreed to offers on WhatsApp can be sent a campaign.
              </p>}
              {!linked && <p style={{ fontSize: '13px', color: 'rgb(161,98,7)', margin: '10px 0 0' }}>
                Your shop's WhatsApp is not linked. You can start now; nothing goes until it is. <Link to="/settings?section=WHATSAPP">Link it</Link>
              </p>}
            </>
          ) : (
            <>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>How it is going</div>
              <Progress p={c.progress} />
              {c.status === 'SENDING' && c.progress.waiting > 0 && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '10px 0 0' }}>
                {c.progress.waiting.toLocaleString('en-IN')} still to go. At up to {perDay} a day, the rest {howLong(c.progress.waiting, perDay)}.
                {!linked ? ' Waiting for your WhatsApp to be linked.' : ''}
              </p>}
            </>
          )}
        </div>
      </div>

      {!draft && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)', fontWeight: 600, fontSize: '14px' }}>Customers ({c.recipients.length.toLocaleString('en-IN')}{c.progress.total > c.recipients.length ? ` of ${c.progress.total.toLocaleString('en-IN')}` : ''})</div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {c.recipients.map(r => (
              <li key={r.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <Link to={`/customers/${r.customerId}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500 }}>{r.name}</Link>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginLeft: '8px' }}>{r.phone}</span>
                  {r.reason && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{r.reason}</div>}
                </div>
                <span style={{ fontSize: '12px', fontWeight: 500, color: RECIPIENT_TONE[r.state] ?? 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {RECIPIENT_LABEL[r.state] ?? r.state}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing && (
        <CampaignEditor campaign={c} shopName={branding?.businessName} saving={update.isPending} onClose={() => setEditing(false)}
          onSave={(body) => run(async () => { await update.mutateAsync({ id, ...body }); setEditing(false); }, 'Saved.')} />
      )}

      <ConfirmModal
        isOpen={confirm === 'start'}
        onClose={() => setConfirm(null)}
        title={`Send to ${count.toLocaleString('en-IN')} customer${count === 1 ? '' : 's'}?`}
        message={`Each gets it by name from your shop's WhatsApp, at up to ${perDay} a day between 10 am and 8 pm, so it ${howLong(count, perDay)}. Once started, the message and the customers cannot change. You can pause or stop it at any time.`}
        confirmText="Start sending"
        onConfirm={() => run(async () => { await start.mutateAsync({ id, expected: count }); setConfirm(null); }, 'Started. Messages go a few at a time.')}
      />
      <ConfirmModal
        isOpen={confirm === 'cancel'}
        onClose={() => setConfirm(null)}
        title="Stop this campaign?"
        message="Messages already handed to WhatsApp still arrive. Nobody else gets it, and a stopped campaign cannot be started again. You can copy it into a new draft."
        confirmText="Stop campaign"
        confirmStyle="danger"
        onConfirm={() => run(async () => { await act.mutateAsync({ id, action: 'cancel' }); setConfirm(null); }, 'Stopped.')}
      />
      <ConfirmModal
        isOpen={confirm === 'delete'}
        onClose={() => setConfirm(null)}
        title="Delete this draft?"
        message="It was never sent, so nobody has it. This cannot be undone."
        confirmText="Delete draft"
        confirmStyle="danger"
        onConfirm={() => run(async () => { await del.mutateAsync(id); navigate('/campaigns'); }, 'Draft deleted.')}
      />
    </div>
  );
}
