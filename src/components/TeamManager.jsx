import React, { useState } from 'react';
import { UserPlus, Loader2, Mail, MessageCircle, Copy, Check, X, KeyRound, Shield, Clock, ShieldCheck, Activity, ScrollText, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  useTeamMembers, useTeamRoles, useTeamActivity, useInviteTeamMember, useUpdateTeamMemberRole,
  useSetTeamMemberStatus, useViewTeamMemberPassword, useSetTeamMemberPassword
} from '../hooks/useTeam';
import { buildCredentialMailto, buildCredentialWhatsapp } from '../lib/credentialShare';
import Select from './common/Select';


function RecentActivity({ onClose }) {
  const { data: events, isLoading } = useTeamActivity();

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '540px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'var(--bg-input)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
              <ScrollText size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Recent Activity</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Security and access events</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-light)', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px' }}><X size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: '200px', paddingRight: '4px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : !events || events.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', border: '1px dashed var(--border-light)', borderRadius: '10px', background: 'var(--bg-input)' }}>
              No activity recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {events.map(event => {
                const isSession = event.type === 'ADMIN_SESSION';
                return (
                  <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', border: '1px solid var(--border-light)', borderRadius: '10px', background: 'var(--bg-input)' }}>
                    {isSession ? <ShieldCheck size={16} color="var(--accent-gold)" /> : <Activity size={16} color="var(--text-secondary)" />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: isSession ? 'var(--accent-gold)' : 'var(--text-primary)', marginBottom: '2px' }}>{event.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(event.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CredentialsPanel({ recipientName, email, password, roleLabel, onDone }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied by the browser -- the credentials are still shown
      // on screen either way, so this isn't the only way to get them.
    }
  };

  return (
    <div style={{ border: '1px solid var(--accent-gold)', background: 'rgba(226, 193, 113, 0.06)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>Credentials for {recipientName}</div>
        <button onClick={onDone} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', background: 'var(--bg-input)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
        <div>Email: {email}</div>
        <div>Password: {password}</div>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
        There's no automatic email delivery yet -- share these with {recipientName} directly. This password is permanent; you can view or change it any time from this page.
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <a href={buildCredentialMailto({ recipientName, email, tempPassword: password, roleLabel })} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', textDecoration: 'none' }}>
          <Mail size={14} /> Email
        </a>
        <a href={buildCredentialWhatsapp({ recipientName, email, tempPassword: password, roleLabel })} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', textDecoration: 'none' }}>
          <MessageCircle size={14} /> WhatsApp
        </a>
        <button onClick={handleCopy} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function InviteForm({ roles, onDone }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState(roles?.[0]?.id || '');
  const [passwordMode, setPasswordMode] = useState('auto'); // auto | custom
  const [customPassword, setCustomPassword] = useState('');
  const inviteMutation = useInviteTeamMember();
  const [credentials, setCredentials] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !roleId) return;
    if (passwordMode === 'custom' && customPassword.length < 6) return;
    try {
      const result = await inviteMutation.mutateAsync({
        name, email, roleId, customPassword: passwordMode === 'custom' ? customPassword : undefined
      });
      setCredentials(result);
    } catch {
      // Toasted by the hook.
    }
  };

  if (credentials) {
    return (
      <CredentialsPanel
        recipientName={credentials.name}
        email={credentials.email}
        password={credentials.password}
        roleLabel={credentials.role}
        onDone={onDone}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '480px', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '20px', marginBottom: '20px', background: 'var(--bg-input)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>Add Team Member</div>
        <button type="button" onClick={onDone} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Name</label>
        <input type="text" className="input-field" value={name} onChange={e => setName(e.target.value)} required />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Email</label>
        <input type="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} required />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Role</label>
        <Select className="input-field" value={roleId} onChange={e => setRoleId(e.target.value)}>
          {roles?.map(r => <option key={r.id} value={r.id}>{r.name.replace(/_/g, ' ')}</option>)}
        </Select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Password</label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: passwordMode === 'custom' ? '8px' : 0 }}>
          <button type="button" onClick={() => setPasswordMode('auto')} style={{ flex: 1, padding: '8px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer', border: `1px solid ${passwordMode === 'auto' ? 'var(--accent-gold)' : 'var(--border-light)'}`, background: passwordMode === 'auto' ? 'rgba(226, 193, 113, 0.1)' : 'var(--bg-card)', color: passwordMode === 'auto' ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>
            Auto-generate
          </button>
          <button type="button" onClick={() => setPasswordMode('custom')} style={{ flex: 1, padding: '8px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer', border: `1px solid ${passwordMode === 'custom' ? 'var(--accent-gold)' : 'var(--border-light)'}`, background: passwordMode === 'custom' ? 'rgba(226, 193, 113, 0.1)' : 'var(--bg-card)', color: passwordMode === 'custom' ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>
            Custom
          </button>
        </div>
        {passwordMode === 'custom' && (
          <input type="text" className="input-field" placeholder="At least 6 characters" value={customPassword} onChange={e => setCustomPassword(e.target.value)} required minLength={6} />
        )}
      </div>
      <button type="submit" className="btn-primary" disabled={inviteMutation.isPending} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px' }}>
        {inviteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
        Create Account
      </button>
    </form>
  );
}

function ShareRow({ recipientName, email, password }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied by the browser -- the password is still shown
      // on screen either way, so this isn't the only way to get it.
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <a href={buildCredentialMailto({ recipientName, email, tempPassword: password })} className="btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', textDecoration: 'none', fontSize: '12px' }}>
        <Mail size={13} /> Email
      </a>
      <a href={buildCredentialWhatsapp({ recipientName, email, tempPassword: password })} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', textDecoration: 'none', fontSize: '12px' }}>
        <MessageCircle size={13} /> WhatsApp
      </a>
      <button onClick={handleCopy} className="btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', fontSize: '12px' }}>
        {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

function PasswordManager({ member, onClose }) {
  const [revealed, setRevealed] = useState(null);
  const [mode, setMode] = useState('view'); // view | set
  const [customPassword, setCustomPassword] = useState('');
  const viewMutation = useViewTeamMemberPassword();
  const setMutation = useSetTeamMemberPassword();

  const handleView = async () => {
    try {
      const result = await viewMutation.mutateAsync(member.id);
      setRevealed(result.password);
    } catch {
      // Toasted by the hook.
    }
  };

  const handleSet = async (auto) => {
    if (!auto && customPassword.length < 6) return;
    try {
      const result = await setMutation.mutateAsync({ userId: member.id, customPassword: auto ? undefined : customPassword });
      setRevealed(result.password);
      setMode('view');
      setCustomPassword('');
    } catch {
      // Toasted by the hook.
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '420px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{member.name}'s Password</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{member.email}</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-light)', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0 }}><X size={14} /></button>
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
          <button onClick={() => { setMode('view'); setRevealed(null); }} style={{ flex: 1, padding: '6px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer', border: `1px solid ${mode === 'view' ? 'var(--accent-gold)' : 'var(--border-light)'}`, background: mode === 'view' ? 'rgba(226, 193, 113, 0.1)' : 'transparent', color: mode === 'view' ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>View Current</button>
          <button onClick={() => { setMode('set'); setRevealed(null); }} style={{ flex: 1, padding: '6px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer', border: `1px solid ${mode === 'set' ? 'var(--accent-gold)' : 'var(--border-light)'}`, background: mode === 'set' ? 'rgba(226, 193, 113, 0.1)' : 'transparent', color: mode === 'set' ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>Set New</button>
        </div>

        {mode === 'view' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {revealed ? (
              <>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', background: 'var(--bg-input)', borderRadius: '8px', padding: '12px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
                  {revealed}
                </div>
                <ShareRow recipientName={member.name} email={member.email} password={revealed} />
              </>
            ) : (
              <button onClick={handleView} disabled={viewMutation.isPending} className="btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px' }}>
                {viewMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />} Reveal Password
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="text" className="input-field" placeholder="New password (at least 6 characters)" value={customPassword} onChange={e => setCustomPassword(e.target.value)} minLength={6} />
            <button onClick={() => handleSet(false)} disabled={setMutation.isPending || customPassword.length < 6} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px' }}>
              {setMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} Set This Password
            </button>
            <button onClick={() => handleSet(true)} disabled={setMutation.isPending} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px' }}>
              <RefreshCw size={14} /> Or Auto-generate Instead
            </button>
            {revealed && (
              <>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', background: 'var(--bg-input)', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid var(--accent-gold)' }}>
                  New password: {revealed}
                </div>
                <ShareRow recipientName={member.name} email={member.email} password={revealed} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeamManager() {
  const { user } = useAuth();
  const { data: members, isLoading } = useTeamMembers();
  const { data: roles } = useTeamRoles();
  const [showInvite, setShowInvite] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState(null);

  const updateRoleMutation = useUpdateTeamMemberRole();
  const setStatusMutation = useSetTeamMemberStatus();

  const currentUserIsSuperAdmin = user?.roles?.includes('SUPER_ADMIN');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <p style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: '480px' }}>
          Add staff, assign their role, and manage access to your workspace.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setShowActivity(true)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', flexShrink: 0 }}>
            <Activity size={16} /> Recent Activity
          </button>
          {!showInvite && (
            <button onClick={() => setShowInvite(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', flexShrink: 0 }}>
              <UserPlus size={16} /> Add Team Member
            </button>
          )}
        </div>
      </div>

      {showInvite && <InviteForm roles={roles} onDone={() => setShowInvite(false)} />}

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)' }}>
                {['Name', 'Role', 'Status', 'Last Active', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members?.map(m => {
                const isSelf = m.id === user?.id;
                const currentRoleId = m.roles?.[0]?.role?.id || '';
                const targetIsSuperAdmin = m.roles?.[0]?.role?.name === 'SUPER_ADMIN';
                // Super Admin outranks Admin -- an Admin viewing this list can see everyone,
                // but can't touch a Super Admin's role, status, or password. Mirrors the
                // same guard enforced server-side in team.service.ts.
                const canManageThisRow = !isSelf && (currentUserIsSuperAdmin || !targetIsSuperAdmin);
                const disabledReason = isSelf
                  ? "You can't manage your own account here"
                  : (!canManageThisRow ? "Only a Super Admin can manage another Super Admin's account" : undefined);
                return (
                  <tr key={m.id} style={{ borderTop: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{m.name} {isSelf && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(you)</span>}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{m.email}</div>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <Select
                        value={currentRoleId}
                        disabled={!canManageThisRow || updateRoleMutation.isPending}
                        onChange={(e) => updateRoleMutation.mutate({ userId: m.id, roleId: e.target.value })}
                        className="input-field"
                        style={{ padding: '4px 8px', fontSize: '12px', width: 'auto' }}
                        title={disabledReason}
                      >
                        {roles?.map(r => <option key={r.id} value={r.id}>{r.name.replace(/_/g, ' ')}</option>)}
                      </Select>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <button
                        disabled={!canManageThisRow || setStatusMutation.isPending}
                        onClick={() => setStatusMutation.mutate({ userId: m.id, status: m.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
                        title={disabledReason || (m.status === 'ACTIVE' ? 'Click to deactivate' : 'Click to reactivate')}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '6px',
                          border: 'none', fontSize: '11px', fontWeight: 600, cursor: canManageThisRow ? 'pointer' : 'default',
                          background: m.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: m.status === 'ACTIVE' ? 'var(--accent-success)' : 'var(--accent-danger)'
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                        {m.status}
                      </button>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        {(m.lastActiveAt || m.lastLoginAt) ? new Date(m.lastActiveAt || m.lastLoginAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Never'}
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => setPasswordTarget(m)}
                        disabled={!canManageThisRow}
                        title={disabledReason || 'View or set password'}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: '6px', cursor: canManageThisRow ? 'pointer' : 'default', fontSize: '11px', color: canManageThisRow ? 'var(--text-secondary)' : 'var(--text-muted)', opacity: canManageThisRow ? 1 : 0.5 }}
                      >
                        <KeyRound size={12} /> Password
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showActivity && <RecentActivity onClose={() => setShowActivity(false)} />}
      {passwordTarget && <PasswordManager member={passwordTarget} onClose={() => setPasswordTarget(null)} />}
    </div>
  );
}
