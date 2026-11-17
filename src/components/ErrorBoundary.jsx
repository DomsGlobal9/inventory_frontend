import React from 'react';
import { AlertTriangle, LifeBuoy, Check } from 'lucide-react';
import { reportClientError } from '../lib/errorReporter';
import { api } from '../lib/api';
import { isStaleFileError, reloadForUpdate, isReloadingForUpdate } from '../lib/updateReload';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, errorMessage: '', linkedErrorId: null, ticketState: 'idle' };

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || 'Unknown error', stale: isStaleFileError(error) };
  }

  componentDidCatch(error, info) {
    // A part of the app that could not be fetched because ScaleEzy was updated while this tab was open: load the
    // page again (once) instead of reporting a crash. If that was just tried, the calm message below is shown.
    if (isStaleFileError(error)) { if (reloadForUpdate()) this.forceUpdate(); return; }
    reportClientError({ message: error?.message, stack: error?.stack || info?.componentStack })
      .then(id => this.setState({ linkedErrorId: id }));
  }

  reportTicket = async () => {
    this.setState({ ticketState: 'sending' });
    try {
      // Deliberately the raw `api` client, not a hook -- this component can render outside
      // any query provider context (it wraps the whole app, including the providers
      // themselves), so it must work standalone.
      await api.post('/support-tickets', {
        subject: `App crash: ${this.state.errorMessage}`.slice(0, 200),
        description: `The app crashed with: ${this.state.errorMessage}\n\nThis happened on: ${window.location?.pathname}`,
        category: 'BUG',
        priority: 'HIGH',
        linkedErrorId: this.state.linkedErrorId || undefined
      });
      this.setState({ ticketState: 'sent' });
    } catch {
      this.setState({ ticketState: 'idle' });
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.state.stale) {
      // The page is already loading again: nothing is drawn over that half-second.
      if (isReloadingForUpdate()) return null;
      return (
        <div role="alert" style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: '14px', padding: '24px', textAlign: 'center',
          fontFamily: 'Inter, -apple-system, sans-serif', color: '#52525b', background: '#fafafa'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#18181b' }}>This page could not load</div>
          <div style={{ fontSize: '14px', maxWidth: '420px', lineHeight: 1.6 }}>
            ScaleEzy may have been updated while this tab was open, or the internet dropped. Reload to carry on. Nothing you saved is lost.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', background: '#164B1E', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
          >
            Reload
          </button>
        </div>
      );
    }

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: '16px', padding: '24px', textAlign: 'center',
        fontFamily: 'Inter, -apple-system, sans-serif', color: '#a1a1aa', background: '#0a0a0c'
      }}>
        <AlertTriangle size={40} color="#e2c171" />
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>Something went wrong</div>
        <div style={{ fontSize: '14px', maxWidth: '420px' }}>
          This has been reported automatically. Try reloading the page.
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px', background: '#e2c171', color: '#000',
              border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
            }}
          >
            Reload
          </button>
          <button
            onClick={this.reportTicket}
            disabled={this.state.ticketState !== 'idle'}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
              background: 'transparent', color: '#e2c171', border: '1px solid #e2c171',
              borderRadius: '8px', fontWeight: 600, cursor: this.state.ticketState === 'idle' ? 'pointer' : 'default'
            }}
          >
            {this.state.ticketState === 'sent' ? <><Check size={16} /> Reported to support</> : <><LifeBuoy size={16} /> Report this issue</>}
          </button>
        </div>
      </div>
    );
  }
}
