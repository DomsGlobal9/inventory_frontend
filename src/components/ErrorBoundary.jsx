import React from 'react';
import { AlertTriangle, LifeBuoy, Check } from 'lucide-react';
import { reportClientError } from '../lib/errorReporter';
import { api } from '../lib/api';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, errorMessage: '', linkedErrorId: null, ticketState: 'idle' };

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || 'Unknown error' };
  }

  componentDidCatch(error, info) {
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
