import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Gift, Cake, Heart, Hourglass, MessageCircle } from 'lucide-react';
import { useLoyaltySettings, useSaveLoyaltySettings, useCampaignOverview } from '../../hooks/useCampaigns';
import { usePermission } from '../../hooks/usePermission';
import PageLoader from '../PageLoader';
import PicturePicker from '../campaigns/PicturePicker';

/**
 * Settings → Loyalty & wishes: how customers earn and spend points, and the automatic WhatsApp
 * messages (birthday, anniversary, points about to lapse, points after a sale).
 *
 * The example line under the numbers is worked out from what is typed, so an owner sees what
 * "1 point per ₹100, worth ₹1" actually gives a customer before saving it.
 */

const DEFAULT_BIRTHDAY = 'Happy birthday, {name}! Wishing you a wonderful year from all of us at {shop}.';
const DEFAULT_ANNIVERSARY = 'Happy anniversary, {name}! Warm wishes from all of us at {shop}.';

const Toggle = ({ id, checked, onChange, children, hint, name }) => (
  <label htmlFor={id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}>
    <input id={id} type="checkbox" aria-label={name} aria-describedby={hint ? `${id}-hint` : undefined} checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: '3px', width: '18px', height: '18px' }} />
    <span>
      <span style={{ fontWeight: 500 }}>{children}</span>
      {hint && <span id={`${id}-hint`} style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{hint}</span>}
    </span>
  </label>
);

const Num = ({ id, label, value, onChange, prefix, suffix, min = 0, max, step = 1, width = '100px' }) => (
  <div>
    <label htmlFor={id} style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>{label}</label>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {prefix && <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{prefix}</span>}
      <input id={id} className="input-field" type="number" inputMode="decimal" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(e.target.value)} style={{ width }} />
      {suffix && <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{suffix}</span>}
    </div>
  </div>
);

export default function LoyaltySettings() {
  const { data, isLoading } = useLoyaltySettings();
  const save = useSaveLoyaltySettings();
  const { can } = usePermission();
  // A picture on the wishes: only for those who may send campaigns, and only once WhatsApp can send pictures.
  const mayPicture = can('campaign:send');
  const overview = useCampaignOverview({ enabled: mayPicture });
  const pictures = mayPicture && !!overview.data?.features?.picture;
  const [f, setF] = useState(null);

  useEffect(() => {
    if (data && !f) setF({
      ...data,
      pointValue: String(data.pointValuePaise / 100),
      birthdayText: data.birthdayText ?? DEFAULT_BIRTHDAY,
      anniversaryText: data.anniversaryText ?? DEFAULT_ANNIVERSARY
    });
  }, [data, f]);

  if (isLoading || !f) return <PageLoader text="LOADING..." />;
  const set = (k) => (v) => setF(prev => ({ ...prev, [k]: v }));

  const per100 = Number(f.pointsPer100) || 0;
  const value = Number(f.pointValue) || 0;
  const back = per100 * value;   // rupees back per ₹100
  const example = per100 > 0 && value > 0
    ? `A ₹5,000 bill earns ${(50 * per100).toLocaleString('en-IN')} points, worth ₹${(50 * per100 * value).toLocaleString('en-IN')} on a later bill — ${back.toLocaleString('en-IN', { maximumFractionDigits: 2 })}% back.`
    : 'Customers earn nothing until both numbers are above zero.';

  const submit = async (e) => {
    e.preventDefault();
    const paise = Math.round(Number(f.pointValue) * 100);
    try {
      const saved = await save.mutateAsync({
        enabled: f.enabled,
        pointsPer100: Number(f.pointsPer100),
        pointValuePaise: paise,
        minRedeemPoints: Number(f.minRedeemPoints),
        maxRedeemPercent: Number(f.maxRedeemPercent),
        expiryMonths: Number(f.expiryMonths),
        birthdayPoints: Number(f.birthdayPoints),
        notifyAfterSale: f.notifyAfterSale,
        birthdayWish: f.birthdayWish,
        birthdayText: f.birthdayText,
        anniversaryWish: f.anniversaryWish,
        anniversaryText: f.anniversaryText,
        expiryReminder: f.expiryReminder,
        // Sent only by those who could change them, so nobody else clears a picture by saving.
        ...(pictures ? { birthdayMediaId: f.birthdayMedia?.id ?? null, anniversaryMediaId: f.anniversaryMedia?.id ?? null } : {})
      });
      setF({ ...saved, pointValue: String(saved.pointValuePaise / 100), birthdayText: saved.birthdayText ?? DEFAULT_BIRTHDAY, anniversaryText: saved.anniversaryText ?? DEFAULT_ANNIVERSARY });
      toast.success('Saved.');
    } catch (err) { toast.error(err?.message || 'Could not save. Check the numbers.'); }
  };

  const section = { border: '1px solid var(--border-light)', borderRadius: '12px', padding: '18px 20px' };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '760px' }}>
      <div>
        <h2 style={{ fontSize: '24px', margin: '0 0 8px', color: 'var(--text-primary)' }}>Loyalty & wishes</h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Reward customers who come back, and remember their special days.</p>
      </div>

      <div style={section}>
        <Toggle id="l-enabled" name="Loyalty points" checked={f.enabled} onChange={set('enabled')}
          hint="Customers earn points on every counter sale, and can use them to pay part of a later bill.">
          <Gift size={16} style={{ verticalAlign: '-3px', marginRight: '6px' }} />Loyalty points
        </Toggle>
        {f.enabled && (
          <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="mobile-col" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <Num id="l-per100" label="Points for every ₹100" value={f.pointsPer100} onChange={set('pointsPer100')} max={100} />
              <Num id="l-value" label="One point is worth" value={f.pointValue} onChange={set("pointValue")} prefix="₹" min={0.01} step={0.01} />
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', background: 'var(--bg-hover)', borderRadius: '8px', padding: '10px 12px' }}>{example}</p>
            <div className="mobile-col" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <Num id="l-min" label="Can use points from" value={f.minRedeemPoints} onChange={set('minRedeemPoints')} suffix="points" />
              <Num id="l-max" label="Points can pay up to" value={f.maxRedeemPercent} onChange={set('maxRedeemPercent')} suffix="% of a bill" min={1} max={100} />
              <Num id="l-expiry" label="Points lapse after" value={f.expiryMonths} onChange={set('expiryMonths')} suffix="months with no visit (0 = never)" max={120} />
            </div>
          </div>
        )}
      </div>

      <div style={section}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, marginBottom: '6px' }}>
          <MessageCircle size={16} /> Automatic WhatsApp messages
        </div>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Sent from your shop's own number, from 10 am, only to customers who agreed to offers — each ends with "Reply STOP". They show under <Link to="/campaigns">Campaigns → Automatic messages</Link>.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <Toggle id="l-bday" name="Birthday wishes" checked={f.birthdayWish} onChange={set('birthdayWish')} hint="On the customer's birthday. Add birthdays on the customer's page.">
              <Cake size={16} style={{ verticalAlign: '-3px', marginRight: '6px' }} />Birthday wishes
            </Toggle>
            {f.birthdayWish && <div style={{ margin: '10px 0 0 30px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <textarea aria-label="Birthday message" className="input-field" rows={3} maxLength={700} value={f.birthdayText} onChange={(e) => set('birthdayText')(e.target.value)} style={{ width: '100%', fontFamily: 'inherit' }} />
              {pictures && <PicturePicker label="Picture above the wish (optional)" value={f.birthdayMedia} onChange={set('birthdayMedia')} disabled={save.isPending} />}
              {f.enabled && <Num id="l-bpoints" label="Birthday gift" value={f.birthdayPoints} onChange={set('birthdayPoints')} suffix="points (0 = no gift)" />}
            </div>}
          </div>
          <div>
            <Toggle id="l-anniv" name="Anniversary wishes" checked={f.anniversaryWish} onChange={set('anniversaryWish')} hint="On the customer's wedding anniversary.">
              <Heart size={16} style={{ verticalAlign: '-3px', marginRight: '6px' }} />Anniversary wishes
            </Toggle>
            {f.anniversaryWish && <div style={{ margin: '10px 0 0 30px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <textarea aria-label="Anniversary message" className="input-field" rows={3} maxLength={700} value={f.anniversaryText} onChange={(e) => set('anniversaryText')(e.target.value)} style={{ width: '100%', fontFamily: 'inherit' }} />
              {pictures && <PicturePicker label="Picture above the wish (optional)" value={f.anniversaryMedia} onChange={set('anniversaryMedia')} disabled={save.isPending} />}
            </div>}
          </div>
          {f.enabled && Number(f.expiryMonths) > 0 && (
            <Toggle id="l-expiry-r" name="Remind customers before their points lapse" checked={f.expiryReminder} onChange={set('expiryReminder')} hint="A week before, so they come back and use them.">
              <Hourglass size={16} style={{ verticalAlign: '-3px', marginRight: '6px' }} />Remind customers before their points lapse
            </Toggle>
          )}
          {f.enabled && (
            <Toggle id="l-after" name="Tell the customer their points after each sale" checked={f.notifyAfterSale} onChange={set('notifyAfterSale')} hint={'"Thank you! You earned 30 points. You now have 250." Goes to any customer who has not replied STOP.'}>
              Tell the customer their points after each sale
            </Toggle>
          )}
        </div>
        <p style={{ margin: '14px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>You can use {'{name}'} and {'{shop}'} in the wishes.</p>
      </div>

      <div>
        <button type="submit" className="btn-primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}
