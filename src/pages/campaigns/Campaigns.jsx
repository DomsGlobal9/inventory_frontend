import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Megaphone, AlertTriangle, ShieldCheck, Gift, Clock, Link2 as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCampaigns, useCampaignOverview, useCreateCampaign } from '../../hooks/useCampaigns';
import { useBranding } from '../../hooks/useBranding';
import { usePermission } from '../../hooks/usePermission';
import PageLoader from '../../components/PageLoader';
import CampaignEditor from '../../components/campaigns/CampaignEditor';
import TemplatePicker from '../../components/campaigns/TemplatePicker';
import { STATUS_TONE, SOURCE_LABEL } from '../../utils/campaignText';

/**
 * WhatsApp campaigns: one message to many customers, from the shop's own number.
 *
 * The page says up front the three things that decide whether a campaign reaches anybody: is the
 * shop's WhatsApp linked, how many customers agreed to offers, and how fast it goes (slowly, on
 * purpose, so the number is never banned).
 */

export function StatusPill({ status }) {
  const t = STATUS_TONE[status] ?? STATUS_TONE.DRAFT;
  return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500, backgroundColor: t.bg, color: t.fg, whiteSpace: 'nowrap' }}>{t.label}</span>;
}

export function Progress({ p }) {
  if (!p?.total) return null;
  const pct = (n) => `${Math.round((n / p.total) * 100)}%`;
  return (
    <div>
      <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', background: 'var(--bg-hover)' }} aria-hidden="true">
        <div style={{ width: pct(p.read), background: 'rgb(21,128,61)' }} />
        <div style={{ width: pct(p.delivered - p.read), background: 'rgb(34,197,94)' }} />
        <div style={{ width: pct(p.sent - p.delivered), background: 'rgb(134,239,172)' }} />
        <div style={{ width: pct(p.failed + p.skipped), background: 'rgb(209,213,219)' }} />
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
        {p.sent.toLocaleString('en-IN')} of {p.total.toLocaleString('en-IN')} sent
        {p.read ? ` · ${p.read.toLocaleString('en-IN')} read` : ''}
        {p.waiting ? ` · ${p.waiting.toLocaleString('en-IN')} waiting` : ''}
        {p.failed + p.skipped ? ` · ${(p.failed + p.skipped).toLocaleString('en-IN')} not sent` : ''}
      </div>
    </div>
  );
}

const when = (c) => {
  const d = new Date(c.startedAt ?? c.createdAt);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function Campaigns() {
  const { can } = usePermission();
  const navigate = useNavigate();
  const [tab, setTab] = useState('MANUAL');
  // false: nothing open; 'pick': choosing a template; otherwise the editor, started from { template }.
  const [editing, setEditing] = useState(false);
  const overview = useCampaignOverview();
  const list = useCampaigns(tab);
  const create = useCreateCampaign();
  const { data: branding } = useBranding();

  if (overview.isLoading) return <PageLoader text="LOADING CAMPAIGNS..." />;
  const o = overview.data;
  const linked = o?.whatsapp?.status === 'CONNECTED';
  const rows = list.data ?? [];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingTop: '24px', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '64px', width: '100%' }}>
      <div className="mobile-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '32px', margin: 0, color: 'var(--text-primary)' }}>Campaigns</h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)' }}>
            Send an offer or news to your customers on WhatsApp, from your shop's own number.
          </p>
        </div>
        {can('campaign:send') && (
          <button className="btn-primary" onClick={() => setEditing('pick')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
            <Plus size={18} /> New campaign
          </button>
        )}
      </div>

      {/* The three things that decide whether a campaign reaches anybody. */}
      <div className="mobile-col" style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div className="card" style={{ flex: 1, padding: '14px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          {linked ? <ShieldCheck size={20} style={{ color: 'rgb(21,128,61)', flexShrink: 0 }} /> : <AlertTriangle size={20} style={{ color: 'rgb(161,98,7)', flexShrink: 0 }} />}
          <div style={{ fontSize: '14px' }}>
            <div style={{ fontWeight: 600 }}>{linked ? "Your shop's WhatsApp is linked" : o?.problem ? "Could not check your shop's WhatsApp" : "Your shop's WhatsApp is not linked"}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
              {linked ? 'Campaigns go from your own number.'
                : o?.problem ?? <>Campaigns wait until it is. <Link to="/settings?section=WHATSAPP">Link it in Settings</Link>.</>}
            </div>
          </div>
        </div>
        <div className="card" style={{ flex: 1, padding: '14px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <Gift size={20} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
          <div style={{ fontSize: '14px' }}>
            <div style={{ fontWeight: 600 }}>{(o?.customers.agreed ?? 0).toLocaleString('en-IN')} customers agreed to offers</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
              Of {(o?.customers.withPhone ?? 0).toLocaleString('en-IN')} with a phone number. Tick <strong>Agrees to offers on WhatsApp</strong> at the counter or on a customer's page.
              {o?.customers.stopped ? ` ${o.customers.stopped} replied STOP.` : ''}
            </div>
          </div>
        </div>
        <div className="card" style={{ flex: 1, padding: '14px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <Clock size={20} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <div style={{ fontSize: '14px' }}>
            <div style={{ fontWeight: 600 }}>Up to {o?.perDay ?? 20} messages a day, {o?.hours ?? '10 am to 8 pm'}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
              Sent slowly on purpose, so WhatsApp never blocks your number and bills always get through.
            </div>
          </div>
        </div>
      </div>

      <div role="tablist" aria-label="Campaign lists" style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {[['MANUAL', 'Your campaigns'], ['AUTO', 'Automatic messages']].map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '6px 14px', fontSize: '13px' }} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {list.isLoading ? <PageLoader text="LOADING..." /> : rows.length === 0 ? (
        <div className="card" style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Megaphone size={32} style={{ opacity: 0.4, marginBottom: '12px' }} />
          <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>
            {tab === 'MANUAL' ? 'No campaigns yet.' : 'No automatic messages yet.'}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: '14px' }}>
            {tab === 'MANUAL'
              ? 'Write one message, choose who gets it, and ScaleEzy sends it to each customer by name.'
              : <>Birthday and anniversary wishes, and reminders before points lapse, appear here once you switch them on in <Link to="/settings?section=LOYALTY">Settings → Loyalty & wishes</Link>.</>}
          </p>
        </div>
      ) : (
        <ul aria-label="Campaigns" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {rows.map(c => (
            <li key={c.id} className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <Link to={`/campaigns/${c.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', overflowWrap: 'anywhere' }}>{c.name}</Link>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {c.source !== 'MANUAL' ? `${SOURCE_LABEL[c.source] ?? c.source} · ` : ''}{c.audienceText} · {when(c)}
                  </div>
                </div>
                <StatusPill status={c.status} />
              </div>
              <div style={{ marginTop: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                {(c.sent?.media ?? c.media) && <img src={(c.sent?.media ?? c.media).url} alt="" style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />}
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minWidth: 0 }}>{c.sent?.text ?? c.text}</div>
              </div>
              {c.status !== 'DRAFT' && (
                <div style={{ marginTop: '10px' }}>
                  <Progress p={c.progress} />
                  {/* Taps go on the row, not inside Progress: the detail page already gives them a
                      line of their own right under the same bar, and saying it twice there reads
                      like two different numbers. */}
                  {c.progress?.tapped != null && (
                    <div style={{ fontSize: '12px', color: 'var(--primary-color)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <LinkIcon size={12} />
                      {c.progress.tapped.toLocaleString('en-IN')} tapped the link
                      {c.progress.taps > c.progress.tapped ? ` (${c.progress.taps.toLocaleString('en-IN')} taps in all)` : ''}
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {editing === 'pick' && (
        <TemplatePicker canDelete={can('campaign:send')} onClose={() => setEditing(false)}
          // A starter's name is ScaleEzy's, not the shop's campaign: the name box starts empty for those.
          onPick={(t) => setEditing({ template: t ? { name: t.starter ? '' : t.name, text: t.text, media: t.media, link: t.link } : null })} />
      )}
      {editing && editing !== 'pick' && (
        <CampaignEditor campaign={editing.template} shopName={branding?.businessName} saving={create.isPending} onClose={() => setEditing(false)}
          onSave={async (body) => {
            try {
              const made = await create.mutateAsync(body);
              setEditing(false);
              toast.success('Draft saved. Check it, then press Start.');
              navigate(`/campaigns/${made.id}`);
            } catch (e) { toast.error(e?.message || 'The campaign could not be saved.'); }
          }} />
      )}
    </div>
  );
}
