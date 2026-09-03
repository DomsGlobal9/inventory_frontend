import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, UserPlus, Mail, Copy, CheckCircle2, Building2, User, KeyRound, AlertTriangle } from 'lucide-react';
import { useAdminClients, useOnboardClient } from '../../hooks/admin/useAdminConsole';
import PageGuide from '../../components/admin/PageGuide';

const STEPS = [
  { key: 'NOT_STARTED', label: 'Not Started', hint: 'No products created yet', color: 'var(--text-secondary)' },
  { key: 'IN_PROGRESS', label: 'In Progress', hint: 'Products exist, none published yet', color: 'var(--accent-gold)' },
  { key: 'ACTIVE', label: 'Active', hint: 'At least one product published', color: 'var(--accent-success)' },
];

function buildOnboardingMailto({ clientId, adminName, adminEmail, tempPassword }) {
  const loginUrl = `${window.location.origin}/login`;
  const subject = 'Welcome to Scaleezy — your Inventory login';
  const body =
`Hi ${adminName},

Your Scaleezy Inventory workspace is ready.

Workspace ID: ${clientId}
Email: ${adminEmail}
Temporary Password: ${tempPassword}

Sign in here: ${loginUrl}

Please sign in and change your password as soon as possible.

— Scaleezy Team`;

  return `mailto:${encodeURIComponent(adminEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function OnboardingPage() {
  const { data, isLoading } = useAdminClients();
  const onboardMutation = useOnboardClient();

  const [form, setForm] = useState({ companyName: '', adminName: '', adminEmail: '' });
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const byStatus = (status) => (data || []).filter(c => c.onboardingStatus === status);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const created = await onboardMutation.mutateAsync(form);
      setResult(created);
      setForm({ companyName: '', adminName: '', adminEmail: '' });
    } catch (error) {
      // handled by hook's onError toast
    }
  };

  const handleSendEmail = () => {
    window.location.href = buildOnboardingMailto(result);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `Workspace ID: ${result.clientId}\nEmail: ${result.adminEmail}\nTemporary Password: ${result.tempPassword}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Could not copy to clipboard — your browser may have blocked it.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--bg-input)', padding: '8px', borderRadius: '8px', display: 'flex', color: 'var(--accent-gold)' }}>
            <UserPlus size={20} />
          </div>
          Onboarding
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '600px' }}>
          Create a new client workspace and seamlessly hand off login credentials to their primary administrator.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', alignItems: 'stretch' }}>
        {/* Create new client */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '14px', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={18} color="var(--accent-gold)" />
            <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px', margin: 0 }}>Register New Client</h3>
          </div>
          
          <div style={{ padding: '24px' }}>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Company Name</label>
                <input
                  type="text" required value={form.companyName}
                  onChange={e => setForm({ ...form, companyName: e.target.value })}
                  placeholder="e.g. Acme Boutique"
                  className="input-field"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '14px' }}
                />
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>This generates the permanent Workspace ID (e.g. "acme-boutique").</p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Admin Name</label>
                  <input
                    type="text" required value={form.adminName}
                    onChange={e => setForm({ ...form, adminName: e.target.value })}
                    placeholder="Jane Doe"
                    className="input-field"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Admin Email</label>
                  <input
                    type="email" required value={form.adminEmail}
                    onChange={e => setForm({ ...form, adminEmail: e.target.value })}
                    placeholder="jane@example.com"
                    className="input-field"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '14px' }}
                  />
                </div>
              </div>
              
              <button
                type="submit" disabled={onboardMutation.isPending}
                style={{ 
                  marginTop: '12px', padding: '14px', 
                  background: 'var(--accent-gold)', color: '#000', 
                  fontWeight: 600, border: 'none', borderRadius: '8px', 
                  cursor: onboardMutation.isPending ? 'not-allowed' : 'pointer', 
                  fontSize: '14px', transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(226, 193, 113, 0.3)',
                  opacity: onboardMutation.isPending ? 0.7 : 1
                }}
                onMouseOver={(e) => { if(!onboardMutation.isPending) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(226, 193, 113, 0.4)'; } }}
                onMouseOut={(e) => { if(!onboardMutation.isPending) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(226, 193, 113, 0.3)'; } }}
              >
                {onboardMutation.isPending ? 'Creating workspace...' : 'Create Client & Generate Credentials'}
              </button>
            </form>
          </div>
        </div>

        {/* Result / send credentials */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '14px', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <KeyRound size={18} color="var(--accent-gold)" />
            <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px', margin: 0 }}>Generated Credentials</h3>
          </div>
          
          <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: result ? 'flex-start' : 'center' }}>
            {!result ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: 'var(--text-muted)', textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KeyRound size={28} style={{ opacity: 0.5 }} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>Awaiting Creation</div>
                  <div style={{ fontSize: '13px' }}>Fill in the form to generate a new client's login credentials.</div>
                </div>
              </div>
            ) : (
              <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', color: 'var(--accent-success)', background: 'rgba(16, 185, 129, 0.1)', padding: '12px 16px', borderRadius: '8px' }}>
                  <CheckCircle2 size={18} />
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>Workspace successfully created!</span>
                </div>
                
                <div style={{ border: '1px solid var(--border-light)', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>Workspace ID</div>
                    <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)', fontWeight: 600, fontSize: '14px' }}>{result.clientId}</div>
                  </div>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>Admin Email</div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500 }}>{result.adminEmail}</div>
                  </div>
                  <div style={{ padding: '14px 16px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>Temp Password</div>
                    <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600, letterSpacing: '1px' }}>{result.tempPassword}</div>
                  </div>
                </div>
                
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={12} color="var(--accent-gold)" />
                  {/* This used to read "shown once -- it won't be retrievable again", which was
                      simply untrue: onboardClient stores an encrypted copy (passwordEncrypted)
                      precisely so it can be re-shared, and the console's Clients > view password
                      decrypts it. Telling an admin the credential is gone forever when the system
                      deliberately keeps it recoverable is both misleading and understates where
                      the credential still lives. */}
                  Share this with the client. You can view it again later from Clients &rarr; this client &rarr; view password.
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    onClick={handleSendEmail}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'rgba(226,193,113,0.1)', border: '1px solid rgba(226,193,113,0.3)', borderRadius: '8px', color: 'var(--accent-gold)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(226,193,113,0.2)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(226,193,113,0.1)'; }}
                  >
                    <Mail size={16} /> Send Email
                  </button>
                  <button
                    onClick={handleCopy}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'var(--bg-input)'; }}
                  >
                    {copied ? <CheckCircle2 size={16} color="var(--accent-success)" /> : <Copy size={16} />} 
                    {copied ? 'Copied!' : 'Copy Details'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Existing clients' setup status */}
      <div style={{ marginTop: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Catalog Setup Board</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>Track client progression through the initial catalog setup phase.</p>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <Loader2 size={32} className="animate-spin" style={{ marginBottom: '16px', color: 'var(--accent-gold)' }} />
          <div style={{ fontSize: '14px', fontWeight: 500 }}>Loading data...</div>
        </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'start' }}>
            {STEPS.map(step => (
              <div key={step.key} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: step.color, boxShadow: `0 0 8px ${step.color}60` }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>{step.label}</span>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                    {byStatus(step.key).length}
                  </span>
                </div>
                
                <div style={{ padding: '12px 20px', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-light)', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {step.hint}
                </div>
                
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '120px', maxHeight: '400px', overflowY: 'auto' }}>
                  {byStatus(step.key).map(c => (
                    <div key={c.clientId} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '14px', transition: 'all 0.2s', cursor: 'default' }} onMouseOver={e => e.currentTarget.style.borderColor = step.color} onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-light)'}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Building2 size={14} color={step.color} />
                        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px', letterSpacing: '-0.02em' }}>{c.clientId}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.productCount}</span> products
                        </span>
                        <span style={{ color: 'var(--border-light)' }}>|</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.userCount}</span> users
                        </span>
                      </div>
                    </div>
                  ))}
                  {byStatus(step.key).length === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', color: 'var(--text-muted)', textAlign: 'center' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                        <CheckCircle2 size={16} style={{ opacity: 0.3 }} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>No clients in this stage</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <PageGuide title="About Onboarding">
        <p>This tab allows you to provision new boutique clients on the platform.</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
          <li><strong>Register Client:</strong> Create a new tenant. This generates a unique workspace ID and an initial set of credentials for the client's admin.</li>
          <li><strong>Credentials:</strong> Copy or email the auto-generated temporary password securely to the client so they can log in.</li>
          <li><strong>Setup Board:</strong> Track the progression of all clients as they add their first products to their catalog.</li>
        </ul>
      </PageGuide>
    </div>
  );
}
