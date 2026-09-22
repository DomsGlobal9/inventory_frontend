import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Send, Loader2 } from 'lucide-react';
import { useSendCampaignTest } from '../../hooks/useCampaigns';

/**
 * "Send me a test": the message, from the shop's WhatsApp, to a number the person types (usually
 * their own). Remembered on this browser so it is typed once.
 */
const KEY = 'scaleezy:campaign-test-to';
const read = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };

export default function TestSend({ campaignId, text, disabled }) {
  const [to, setTo] = useState(read);
  const test = useSendCampaignTest();
  const send = async () => {
    try {
      const r = await test.mutateAsync(campaignId ? { campaignId, to } : { text, to });
      try { localStorage.setItem(KEY, to); } catch { /* not kept */ }
      toast.success(`Test sent to ${r.to} from your shop's WhatsApp.`);
    } catch (e) { toast.error(e?.message || 'The test could not be sent.'); }
  };
  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      <input className="input-field" type="tel" inputMode="tel" aria-label="Send the test to" placeholder="Your WhatsApp number" value={to}
        onChange={(e) => setTo(e.target.value)} maxLength={20} style={{ width: '100%' }} />
      <button type="button" className="btn-secondary" disabled={disabled || !to.trim() || test.isPending} onClick={send}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
        {test.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send me a test
      </button>
    </div>
  );
}
