import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Building2, Users, Rocket, HeartPulse, ScrollText, Bug, LifeBuoy, LogOut, ShieldCheck, Sun, Moon } from 'lucide-react';
import { usePlatformAdmin } from '../context/PlatformAdminContext';
import { useTheme } from '../contexts/ThemeContext';

const NAV_ITEMS = [
  { name: 'Clients', path: '/platformconsole/clients', icon: Building2 },
  { name: 'Users', path: '/platformconsole/users', icon: Users },
  { name: 'Onboarding', path: '/platformconsole/onboarding', icon: Rocket },
  { name: 'Inventory Health', path: '/platformconsole/health', icon: HeartPulse },
  { name: 'Errors', path: '/platformconsole/errors', icon: Bug },
  { name: 'Support', path: '/platformconsole/support', icon: LifeBuoy },
  { name: 'Audit Log', path: '/platformconsole/audit-log', icon: ScrollText },
];

export default function AdminConsoleLayout() {
  const { admin, logout } = usePlatformAdmin();
  const navigate = useNavigate();
  // Use the app-wide ThemeContext rather than poking data-theme directly. The old local
  // state wrote the attribute by hand and never touched localStorage, so the console's
  // theme reset on every refresh -- and because ThemeContext's own state was left stale,
  // the client app's toggle then appeared dead on its first click.
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    navigate('/platformconsole/login', { replace: true });
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: 'var(--bg-dark)', color: 'var(--text-primary)', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <aside style={{ width: '260px', flexShrink: 0, borderRight: '1px solid var(--border-light)', backgroundColor: 'var(--bg-card)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: '72px', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 24px', borderBottom: '1px solid var(--border-light)' }}>
          <ShieldCheck size={22} color="var(--accent-gold)" />
          <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>Platform Console</span>
        </div>

        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--bg-hover)' : 'transparent',
                  textDecoration: 'none', fontSize: '14px', fontWeight: isActive ? 600 : 500
                })}
              >
                <Icon size={18} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '2px', fontWeight: 500 }}>{admin?.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{admin?.email}</div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={toggleTheme}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', padding: '8px', background: 'transparent', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '8px', padding: '8px 12px', background: 'transparent', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = 'var(--accent-danger)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-light)'; }}
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', backgroundColor: 'var(--bg-dark)' }}>
        <Outlet />
      </main>
    </div>
  );
}
