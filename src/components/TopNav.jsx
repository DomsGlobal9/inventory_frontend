import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Settings, User, Menu, Loader2, LogOut, CheckCheck, Sun, Moon, Pin, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLocationContext } from '../contexts/LocationContext';
import { useTheme } from '../contexts/ThemeContext';
import { MapPin } from 'lucide-react';
import { useAlerts, useMarkAlertRead, useMarkAllAlertsRead, useTogglePinAlert, useDeleteAlert } from '../hooks/useAlerts';

export default function TopNav({ onMenuClick }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { locations, currentLocation, setCurrentLocationId } = useLocationContext();
  const { data: alertData } = useAlerts();
  const markAlertRead = useMarkAlertRead();
  const markAllAlertsRead = useMarkAllAlertsRead();
  const togglePinAlert = useTogglePinAlert();
  const deleteAlert = useDeleteAlert();
  const { theme, toggleTheme } = useTheme();

  const [showNotification, setShowNotification] = useState(false);
  const [isAlertMenuOpen, setIsAlertMenuOpen] = useState(false);
  const prevUnreadCountRef = useRef(0);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isAlertMenuOpen && !e.target.closest('.alert-dropdown-container')) {
        setIsAlertMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAlertMenuOpen]);

  useEffect(() => {
    const currentUnread = alertData?.unreadCount || 0;
    if (currentUnread > prevUnreadCountRef.current) {
      // New alert came in!
      setShowNotification(true);
      
      // Play a subtle notification sound (requires a valid URL or standard web audio)
      try {
        const audio = new Audio('/notification.mp3'); // Assuming standard placement
        // For fallback we can use a quick web audio beep if the file doesn't exist
        const playBeep = () => {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          osc.start();
          gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
          osc.stop(ctx.currentTime + 0.5);
        };
        audio.play().catch(playBeep);
      } catch(e) {}
      
      // Removed the 3-second auto-hide so the notification 'stands'
    }
    prevUnreadCountRef.current = currentUnread;
  }, [alertData?.unreadCount]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleSearch = async (e) => {
    if (e.key === 'Enter' && query.trim()) {
      setIsSearching(true);
      try {
        const response = await api.get(`/search?q=${encodeURIComponent(query.trim())}`);
        const data = response.data;
        
        const scanned = query.trim();

        // If we found a variant, jump straight to it on the Variants tab
        if (data?.variants?.length > 0) {
          navigate(data.variants[0].url);
          setQuery(''); // Clear so the next scan doesn't concatenate onto this one
        }
        // Else if we found a product, open the product
        else if (data?.products?.length > 0) {
          navigate(data.products[0].url);
          setQuery('');
        }
        // Nothing matched. This used to do absolutely nothing -- the barcode just sat in
        // the box, so a scan of an unknown/mislabelled item was indistinguishable from the
        // scanner not firing at all. The query is deliberately LEFT in place so it can be
        // corrected rather than retyped.
        else {
          toast.error(`Nothing found for "${scanned}". Check the barcode or SKU.`);
        }
        // Note: V2 would show a dropdown for multiple fuzzy results. 
        // For V1 hardware scanner support, jumping to the first exact match is best.
      } catch (error) {
        console.error('Search failed', error);
        toast.error(error?.message || 'Search failed. Please try again.');
      } finally {
        setIsSearching(false);
      }
    }
  };

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 48px',
      height: '80px',
      borderBottom: '1px solid var(--border-light)',
      backgroundColor: 'var(--bg-card)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
        {/* Mobile Hamburger Menu */}
        <button 
          className="btn-icon mobile-only-icon" 
          onClick={onMenuClick}
        >
          <Menu size={24} />
        </button>
        <style>{`
          .mobile-only-icon { display: none; }
          @media (max-width: 768px) {
            .mobile-only-icon { display: block; color: var(--text-primary); }
          }
        `}</style>

        <div className="mobile-hide" style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--bg-input)',
          border: '1px solid var(--border-light)',
          borderRadius: '8px',
          padding: '10px 16px',
          width: '400px',
          maxWidth: '100%'
        }}>
          {isSearching ? (
            <Loader2 size={18} className="animate-spin" color="var(--text-secondary)" style={{ marginRight: '12px', flexShrink: 0 }} />
          ) : (
            <Search size={18} color="var(--text-secondary)" style={{ marginRight: '12px', flexShrink: 0 }} />
          )}
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleSearch}
          placeholder="Search products, SKU, barcode..." 
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            width: '100%',
            fontSize: '14px',
          }}
        />
        </div>
        
        {locations.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '0 12px', height: '40px' }}>
            <MapPin size={16} color="var(--text-secondary)" style={{ marginRight: '8px' }} />
            <select 
              value={currentLocation?.id || ''} 
              onChange={(e) => setCurrentLocationId(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer' }}
            >
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="alert-dropdown-container" style={{ position: 'relative' }}>
          <button className="btn-icon" onClick={() => setIsAlertMenuOpen(!isAlertMenuOpen)}>
            <Bell size={20} />
            {alertData?.unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px',
                background: 'var(--accent-danger)', color: 'white',
                fontSize: '10px', fontWeight: 'bold', padding: '2px 6px',
                borderRadius: '10px'
              }}>
                {alertData.unreadCount}
              </span>
            )}
          </button>
          
          {/* Notification Toast (New Alert) */}
          {showNotification && !isAlertMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '40px',
              right: 0,
              width: '250px',
              background: 'var(--bg-card)',
              border: '1px solid var(--accent-danger)',
              borderRadius: '8px',
              padding: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 50,
              animation: 'slideDown 0.3s ease-out'
            }}>
              <style>{`
                @keyframes slideDown {
                  from { opacity: 0; transform: translateY(-10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={16} color="var(--accent-danger)" />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>New Inventory Alert!</span>
                <button onClick={() => setShowNotification(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginLeft: 'auto', padding: 0 }}>&times;</button>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                You have {alertData?.unreadCount} unread alerts.
              </p>
              <button 
                onClick={() => { setShowNotification(false); setIsAlertMenuOpen(true); }}
                style={{ marginTop: '8px', width: '100%', padding: '6px', background: 'var(--accent-danger)', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
              >
                View Now
              </button>
            </div>
          )}

          {/* Alert Dropdown Menu */}
          {isAlertMenuOpen && (
            <div style={{
              position: 'absolute', top: '48px', right: 0, width: '320px',
              background: 'var(--bg-card)', border: '1px solid var(--border-light)',
              borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              zIndex: 100, overflow: 'hidden', display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Recent Alerts</span>
                {alertData?.unreadCount > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markAllAlertsRead.mutate();
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}
                  >
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {alertData?.alerts?.length > 0 ? (
                  alertData.alerts.slice(0, 5).map(alert => (
                    <div
                      key={alert.id}
                      onClick={() => {
                        if (!alert.isRead) markAlertRead.mutate(alert.id);
                        setIsAlertMenuOpen(false);
                        navigate('/inventory/alerts');
                      }}
                      style={{
                        padding: '12px 16px', borderBottom: '1px solid var(--border-light)',
                        cursor: 'pointer', background: alert.isPinned ? 'rgba(212, 175, 55, 0.08)' : (!alert.isRead ? 'rgba(239, 68, 68, 0.05)' : 'transparent'),
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = alert.isPinned ? 'rgba(212, 175, 55, 0.08)' : (!alert.isRead ? 'rgba(239, 68, 68, 0.05)' : 'transparent')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {alert.isPinned && <Pin size={11} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} fill="var(--accent-gold)" />}
                          {alert.productTitle}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <span style={{ fontSize: '11px', color: alert.type === 'OUT_OF_STOCK' ? 'var(--accent-danger)' : 'var(--accent-gold)' }}>
                            {alert.type === 'OUT_OF_STOCK' ? 'OUT OF STOCK' : 'LOW STOCK'}
                          </span>
                          <button
                            title={alert.isPinned ? 'Unpin' : 'Pin'}
                            onClick={(e) => { e.stopPropagation(); togglePinAlert.mutate(alert.id); }}
                            style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: alert.isPinned ? 'var(--accent-gold)' : 'var(--text-muted)', display: 'flex' }}
                          >
                            <Pin size={13} fill={alert.isPinned ? 'var(--accent-gold)' : 'none'} />
                          </button>
                          <button
                            title="Dismiss"
                            onClick={(e) => { e.stopPropagation(); deleteAlert.mutate(alert.id); }}
                            style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>{alert.message}</p>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No recent alerts.
                  </div>
                )}
              </div>
              <div 
                onClick={() => { setIsAlertMenuOpen(false); navigate('/inventory/alerts'); }}
                style={{ padding: '12px', textAlign: 'center', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', borderTop: '1px solid var(--border-light)' }}
              >
                View All Alerts
              </div>
            </div>
          )}
        </div>
        <button className="btn-icon" onClick={toggleTheme}>
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>
    </nav>
  );
}
