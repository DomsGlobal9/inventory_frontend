import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Settings, User, Menu, Loader2, LogOut, CheckCheck, Sun, Moon, Pin, X, HelpCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLocationContext } from '../contexts/LocationContext';
import { useTheme } from '../contexts/ThemeContext';
import { MapPin } from 'lucide-react';
import { useAlerts, useMarkAlertRead, useMarkAllAlertsRead, useTogglePinAlert, useDeleteAlert } from '../hooks/useAlerts';
import Select from './common/Select';


export default function TopNav({ onMenuClick }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { locations, currentLocation, setCurrentLocationId } = useLocationContext();
  const route = useLocation();
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
  //
  // The "new alert" popup is included here now, and it matters more than tidiness. That
  // popup hangs 100px BELOW the nav at z-index 50, which on a narrow window lands squarely
  // on top of the page's own action button -- Start Counting, New Audit, whatever the screen
  // leads with. It had no auto-hide by design ("so the notification stands"), so it stood
  // there swallowing every click aimed at the button underneath, indefinitely, with nothing
  // to suggest that was what was happening. Two flows were dead in the water because of it.
  //
  // Standing until read is the right instinct; standing until it blocks the app is not.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (e.target.closest('.alert-dropdown-container')) return;
      if (isAlertMenuOpen) setIsAlertMenuOpen(false);
      if (showNotification) setShowNotification(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    // A phone does not always send mousedown -- a finger that scrolls the page sends only touch
    // and scroll events -- so on a phone the popup stood over the page's heading however much the
    // person moved. Any touch or scroll outside it now puts it away too.
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    const handleScroll = () => { if (showNotification) setShowNotification(false); };
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [isAlertMenuOpen, showNotification]);

  // And a backstop, for the person who never touches anything. Long enough to read a two-line
  // notice; shorter on a phone, where the popup covers the top of the page rather than a corner of
  // it. The bell keeps its unread badge either way, so nothing is lost when this goes.
  useEffect(() => {
    if (!showNotification) return;
    const onPhone = window.matchMedia?.('(max-width: 900px)').matches;
    const timer = setTimeout(() => setShowNotification(false), onPhone ? 4000 : 8000);
    return () => clearTimeout(timer);
  }, [showNotification]);

  /*
   * Announced once, not on every page.
   *
   * The count this compares against starts at zero whenever the app loads, so with any unread
   * alerts at all the popup came back on every refresh and every sign-in -- for alerts the person
   * had already been told about. The highest count announced is kept for the browser session, and
   * only a count above it is news.
   */
  const ALERT_ANNOUNCED_KEY = 'scaleezy_alerts_announced';
  const announcedCount = () => {
    try { return Number(sessionStorage.getItem(ALERT_ANNOUNCED_KEY)) || 0; } catch { return 0; }
  };

  useEffect(() => {
    // Nothing is known until the alerts have loaded. Reading "no count yet" as zero reset the
    // remembered number on every page load, and the real count arriving a moment later looked new.
    if (alertData?.unreadCount == null) return;
    const currentUnread = alertData.unreadCount;
    // Read alerts lower the count; remember the lower number so the next new one is announced.
    if (currentUnread < announcedCount()) {
      try { sessionStorage.setItem(ALERT_ANNOUNCED_KEY, String(currentUnread)); } catch { /* storage refused */ }
    }
    if (currentUnread > prevUnreadCountRef.current && currentUnread > announcedCount()) {
      try { sessionStorage.setItem(ALERT_ANNOUNCED_KEY, String(currentUnread)); } catch { /* storage refused */ }
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
      
      // It stands until dismissed, touched or scrolled away from, or a few seconds pass -- see
      // the effects above for why it cannot be allowed to stand indefinitely.
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
      padding: 'clamp(0px, 3vw, 48px)',
      paddingTop: 0,
      paddingBottom: 0,
      height: '80px',
      gap: '12px',
      borderBottom: '1px solid var(--border-light)',
      backgroundColor: 'var(--bg-card)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
        {/* Mobile Hamburger Menu */}
        <button
          className="btn-icon mobile-only-icon"
          onClick={onMenuClick}
          aria-label="Open menu"
          data-tour="menu-button"
        >
          <Menu size={24} />
        </button>
        <style>{`
          /*
            Shown wherever the sidebar slides instead of staying put, which is now tablets as
            well as phones (see the 1024px block in index.css). The two breakpoints have to
            agree: at 769-1024 this button was hidden while the sidebar was permanent, which
            was consistent -- but the moment the sidebar starts sliding there and this stays
            hidden, a tablet has navigation it cannot open at all.
          */
          .mobile-only-icon { display: none; }
          @media (max-width: 1024px) {
            .mobile-only-icon { display: block; color: var(--text-primary); }
          }
        `}</style>

        <div className="mobile-hide" data-tour="search" style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--bg-input)',
          border: '1px solid var(--border-light)',
          borderRadius: '8px',
          padding: '10px 16px',
          flex: '1 1 180px',
          minWidth: 0,
          maxWidth: '400px'
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
          aria-label="Search products, SKU or barcode"
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
          <div data-tour="store-switcher" title="The store you are working in" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '0 12px', height: '40px', minWidth: 0, flexShrink: 1 }}>
            <MapPin size={16} color="var(--text-secondary)" style={{ marginRight: '8px', flexShrink: 0 }} />
            <Select 
              value={currentLocation?.id || ''} 
              onChange={(e) => setCurrentLocationId(e.target.value)}
              variant="ghost"
              style={{ width: '100%', minWidth: '96px', maxWidth: '180px' }}
            >
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>
              ))}
            </Select>
          </div>
        )}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="alert-dropdown-container" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/*
            The "new alert" notice, INSIDE the bar rather than hanging below it.

            It used to drop 40px under the bell as a 250px card, which on every screen is exactly
            where the page keeps its main buttons: it sat over Import Updates on Products, and on a
            phone over the page heading and the Active & Drafts filter. Closing on a click or after
            a few seconds only shortened how long it was in the way. In the bar it covers nothing.
            On a phone there is no room in the bar for words, so the bell's badge pulses instead.
          */}
          {showNotification && !isAlertMenuOpen && (
            <div className="new-alert-chip" role="status" style={{
              display: 'flex', alignItems: 'center', gap: '6px', height: '32px', padding: '0 4px 0 10px',
              borderRadius: '16px', border: '1px solid var(--accent-danger)', background: 'var(--bg-card)',
              fontSize: '12px', whiteSpace: 'nowrap', animation: 'newAlertIn 0.3s ease-out'
            }}>
              <button
                onClick={() => { setShowNotification(false); setIsAlertMenuOpen(true); }}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-primary)', fontSize: '12px', fontWeight: 600 }}
                title="Open the stock alerts"
              >
                {alertData?.unreadCount === 1 ? '1 new stock alert' : `${alertData?.unreadCount} new stock alerts`} · View
              </button>
              <button
                onClick={() => setShowNotification(false)}
                aria-label="Close this notice"
                title="Close"
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0 6px', fontSize: '16px', lineHeight: 1 }}
              >&times;</button>
            </div>
          )}
          <style>{`
            @keyframes newAlertIn { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: none; } }
            @keyframes newAlertPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.35); } }
            @media (max-width: 900px) { .new-alert-chip { display: none !important; } }
            .alert-badge.fresh { animation: newAlertPulse 0.9s ease-in-out 4; }
          `}</style>
          <button className="btn-icon" onClick={() => setIsAlertMenuOpen(!isAlertMenuOpen)} aria-label="Stock alerts" title="Stock alerts" data-tour="alerts" style={{ position: 'relative' }}>
            <Bell size={20} />
            {alertData?.unreadCount > 0 && (
              <span className={showNotification ? 'alert-badge fresh' : 'alert-badge'} style={{
                position: 'absolute', top: '-4px', right: '-4px',
                background: 'var(--accent-danger)', color: 'white',
                fontSize: '10px', fontWeight: 'bold', padding: '2px 6px',
                borderRadius: '10px'
              }}>
                {alertData.unreadCount}
              </span>
            )}
          </button>
          
          {/* Alert Dropdown Menu */}
          {isAlertMenuOpen && (
            <div style={{
              position: 'absolute', top: '48px', right: 0, width: '320px',
              background: 'var(--bg-card)', border: '1px solid var(--border-light)',
              borderRadius: '8px', boxShadow: 'var(--shadow-panel)',
              zIndex: 100, overflow: 'hidden', display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Recent Alerts</span>
                {alertData?.unreadCount > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (markAllAlertsRead.isPending) return;
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
                          {/* Scoped to this alert -- see AlertCenter for why the shared
                              isPending alone is the wrong test. */}
                          <button
                            title="Dismiss"
                            onClick={(e) => { e.stopPropagation(); deleteAlert.mutate(alert.id); }}
                            disabled={deleteAlert.isPending && deleteAlert.variables === alert.id}
                            style={{
                              background: 'none', border: 'none', padding: '2px', display: 'flex',
                              color: 'var(--text-muted)',
                              opacity: deleteAlert.isPending && deleteAlert.variables === alert.id ? 0.4 : 1,
                              cursor: deleteAlert.isPending && deleteAlert.variables === alert.id ? 'wait' : 'pointer'
                            }}
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
        {/* The guide for the screen you are on, in a new tab so a half-finished sale or order is not lost.
            Only the path is passed; the Help Center (loaded separately) picks the page. */}
        <a
          className="btn-icon"
          href={`/help?from=${encodeURIComponent(route.pathname)}`}
          target="_blank"
          rel="noopener"
          aria-label="Help for this screen"
          title="Help for this screen"
          data-tour="help"
          style={{ display: 'grid', placeItems: 'center' }}
        >
          <HelpCircle size={20} />
        </a>
        <button className="btn-icon" onClick={toggleTheme} aria-label="Light or dark theme" title="Light or dark theme" data-tour="theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>
    </nav>
  );
}
