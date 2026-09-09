import React, { useMemo, useState } from 'react';
import { Shield, Plus, Trash2, Users, Lock, AlertTriangle, Check, X, Eye } from 'lucide-react';
import {
  useRoles, usePermissionCatalogue, useCreateRole, useUpdateRole, useDeleteRole, useRoleImpact
} from '../hooks/useRoles';
import ConfirmModal from './ConfirmModal';

/**
 * Deciding what a job is allowed to do.
 *
 * Two things this screen is careful about, both learned from the audit that produced it.
 *
 * **A tick that comes with another tick is shown, not hidden.** Granting "see money reports"
 * confers "see what the business paid". If the screen quietly ticked the second box the person
 * would think they had chosen it; if it showed nothing they would think they had avoided it.
 * It is shown, ticked, locked, and labelled "comes with" -- so the consequence of the choice is
 * on screen while the choice is being made.
 *
 * **Nothing here is the enforcement.** Every rule this screen draws is also applied in
 * services/role-management, because a disabled checkbox stops nobody with a terminal.
 */
export default function RoleManager() {
  const { data: roles = [], isLoading } = useRoles();
  const { data: catalogue } = usePermissionCatalogue();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const impact = useRoleImpact();

  const [editing, setEditing] = useState(null);   // role object, or { isNew: true }
  const [chosen, setChosen] = useState(new Set());
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [preview, setPreview] = useState(null);

  const groups = catalogue?.groups ?? [];
  const templates = catalogue?.templates ?? [];

  /** Everything the current ticks confer, so implied boxes can be drawn as such. */
  const byKey = useMemo(() => {
    const m = new Map();
    groups.forEach(g => g.permissions.forEach(p => m.set(p.key, p)));
    return m;
  }, [groups]);

  const implied = useMemo(() => {
    const out = new Set();
    const walk = (key) => {
      const def = byKey.get(key);
      (def?.implies ?? []).forEach(k => { if (!out.has(k)) { out.add(k); walk(k); } });
    };
    chosen.forEach(walk);
    // A key that was ticked outright is a choice, not a consequence, even if something else
    // would have implied it anyway.
    chosen.forEach(k => out.delete(k));
    return out;
  }, [chosen, byKey]);

  const startNew = () => {
    setEditing({ isNew: true });
    setName(''); setDescription(''); setChosen(new Set()); setPreview(null);
  };

  const startEdit = (role) => {
    setEditing(role);
    setName(role.name);
    setDescription(role.description || '');
    setChosen(new Set(role.permissions));
    setPreview(null);
  };

  const applyTemplate = (t) => {
    setChosen(new Set(t.permissions));
    if (!name) setName(t.name);
    if (!description) setDescription(t.description);
  };

  const toggle = (key) => {
    setChosen(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    setPreview(null);
  };

  const save = async () => {
    const payload = { name, description, permissions: [...chosen] };
    if (editing?.isNew) await createRole.mutateAsync(payload);
    else await updateRole.mutateAsync({ id: editing.id, ...payload });
    setEditing(null);
  };

  /** What saving would take away from the people already on this role. */
  const checkImpact = async () => {
    if (editing?.isNew) return;
    const result = await impact.mutateAsync({ id: editing.id, permissions: [...chosen] });
    setPreview(result);
  };

  if (isLoading) return <div style={{ padding: 24, color: 'var(--text-secondary)' }}>Loading roles…</div>;

  // ── The list ───────────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 18, margin: 0, color: 'var(--text-primary)' }}>Roles</h3>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary)', maxWidth: 620 }}>
              A role decides what someone can do. Change it here and it changes for everyone
              who has that role.
            </p>
          </div>
          <button onClick={startNew} style={btnPrimary}>
            <Plus size={15} /> New role
          </button>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {roles.map(role => (
            <div key={role.id} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <Shield size={16} style={{ color: role.isOwner ? '#b45309' : 'var(--text-secondary)', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>{role.name}</strong>
                    {role.isOwner && <span style={pillWarn}><Lock size={10} /> Owner — cannot be changed</span>}
                    {/* The single fact a shopkeeper most wants to know at a glance. */}
                    {role.canSeeCost && !role.isOwner && <span style={pillCost}><Eye size={10} /> Sees what you paid</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                    {role.description || 'No description'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                <span
                  style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}
                  title={role.memberCount === 1 ? '1 person has this role' : `${role.memberCount} people have this role`}
                >
                  <Users size={13} /> {role.memberCount}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {role.isOwner ? 'everything' : `${role.effectivePermissions.length} things`}
                </span>
                {role.editable ? (
                  <>
                    <button onClick={() => startEdit(role)} style={btnGhost}>Edit</button>
                    <button
                      onClick={() => setConfirmDelete(role)}
                      style={{ ...btnGhost, color: '#b91c1c' }}
                      title={role.memberCount > 0 ? 'People are using this role' : 'Delete'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : (
                  <button onClick={() => startEdit(role)} style={btnGhost}>View</button>
                )}
              </div>
            </div>
          ))}
        </div>

        <ConfirmModal
          isOpen={!!confirmDelete}
          title={`Delete "${confirmDelete?.name}"?`}
          // Said before they click, not after the server refuses. The refusal still happens --
          // this is so it is not a surprise.
          message={confirmDelete?.memberCount > 0
            ? `${confirmDelete.memberCount} ${confirmDelete.memberCount === 1 ? 'person is' : 'people are'} using this role. Move them to another role first — this will not go through.`
            : 'Nobody is using this role, so nothing changes for anyone.'}
          confirmText="Delete role"
          confirmStyle="danger"
          onConfirm={async () => { await deleteRole.mutateAsync(confirmDelete.id); setConfirmDelete(null); }}
          onClose={() => setConfirmDelete(null)}
        />
      </div>
    );
  }

  // ── The editor ─────────────────────────────────────────────────────────────
  const locked = !editing.isNew && !editing.editable;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12 }}>
        <h3 style={{ fontSize: 18, margin: 0, color: 'var(--text-primary)' }}>
          {editing.isNew ? 'New role' : locked ? editing.name : `Edit ${editing.name}`}
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setEditing(null)} style={btnGhost}>Back</button>
          {!locked && (
            <button onClick={save} disabled={!name.trim() || createRole.isPending || updateRole.isPending} style={btnPrimary}>
              {createRole.isPending || updateRole.isPending ? 'Saving…' : 'Save role'}
            </button>
          )}
        </div>
      </div>

      {locked && (
        <div style={noteWarn}>
          <Lock size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            This is the owner's role. It can do everything, and it cannot be edited — it is what
            gets you back in if another role is set up wrongly.
          </span>
        </div>
      )}

      {!locked && (
        <>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.4fr)', marginBottom: 18 }}>
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={labelText}>Name this job</span>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Shop floor" style={input} maxLength={40} />
            </label>
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={labelText}>What do they do? (optional)</span>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Sells to customers, cannot see costs" style={input} />
            </label>
          </div>

          {editing.isNew && templates.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ ...labelText, marginBottom: 8 }}>Start from a common job, then change it</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {templates.map(t => (
                  <button key={t.key} onClick={() => applyTemplate(t)} style={chip} title={t.description}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {groups.map(group => (
        <div key={group.group} style={{ marginBottom: 18 }}>
          <div style={{ ...labelText, marginBottom: 8 }}>{group.group}</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {group.permissions.map(p => {
              const isChosen = chosen.has(p.key);
              const isImplied = implied.has(p.key);
              const on = isChosen || isImplied || locked;
              const disabled = locked || isImplied || !p.grantable;
              return (
                <label
                  key={p.key}
                  style={{
                    ...row,
                    opacity: !p.grantable && !locked ? 0.5 : 1,
                    cursor: disabled ? 'default' : 'pointer',
                    borderColor: on ? 'var(--border-strong, #d4d4d8)' : 'var(--border-light)',
                    background: on ? 'var(--bg-subtle, #fafafa)' : 'transparent'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={disabled}
                    onChange={() => toggle(p.key)}
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{p.label}</span>
                    <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {/* Why this box is ticked and greyed. Without it the screen looks broken. */}
                      {isImplied && <span style={pillMuted}>comes with something else you picked</span>}
                      {p.sensitive && <span style={pillCost}>sensitive</span>}
                      {p.exposesCost && <span style={pillCost}>shows what you paid</span>}
                      {!p.grantable && !locked && <span style={pillMuted}>you do not have this yourself</span>}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {!locked && !editing.isNew && (
        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 16, marginTop: 8 }}>
          <button onClick={checkImpact} disabled={impact.isPending} style={btnGhost}>
            {impact.isPending ? 'Checking…' : 'Who does this affect?'}
          </button>

          {preview && (
            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
              <div style={{ marginBottom: 6 }}>
                <strong style={{ color: 'var(--text-primary)' }}>{preview.memberCount}</strong>{' '}
                {preview.memberCount === 1 ? 'person has' : 'people have'} this role
                {preview.members.length > 0 && `: ${preview.members.map(m => m.name || m.email).join(', ')}`}
              </div>
              {preview.losing.length > 0 && (
                <div style={noteWarn}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>They will lose: {preview.losing.map(l => l.label.toLowerCase()).join('; ')}</span>
                </div>
              )}
              {preview.gaining.length > 0 && (
                <div style={{ ...noteWarn, background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
                  <Check size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>They will gain: {preview.gaining.map(l => l.label.toLowerCase()).join('; ')}</span>
                </div>
              )}
              {preview.losing.length === 0 && preview.gaining.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <X size={13} /> Nothing changes for them.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── styles ───────────────────────────────────────────────────────────────────
const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
  border: '1px solid transparent', background: 'var(--text-primary)', color: 'var(--bg-card)',
  fontSize: 13, fontWeight: 500, cursor: 'pointer'
};
const btnGhost = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8,
  border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-primary)',
  fontSize: 13, cursor: 'pointer'
};
const card = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
  padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border-light)',
  background: 'var(--bg-card)'
};
const row = {
  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
  borderRadius: 10, border: '1px solid var(--border-light)'
};
const input = {
  padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-light)',
  background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, width: '100%'
};
const labelText = { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.01em' };
const pillBase = {
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px',
  borderRadius: 999, fontSize: 11, fontWeight: 500
};
const pillWarn = { ...pillBase, background: '#fef3c7', color: '#92400e' };
const pillCost = { ...pillBase, background: '#fee2e2', color: '#991b1b' };
const pillMuted = { ...pillBase, background: 'var(--bg-subtle, #f4f4f5)', color: 'var(--text-secondary)' };
const noteWarn = {
  display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10,
  background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: 13, marginTop: 8
};
const chip = {
  padding: '7px 12px', borderRadius: 999, border: '1px solid var(--border-light)',
  background: 'transparent', color: 'var(--text-primary)', fontSize: 12.5, cursor: 'pointer'
};
