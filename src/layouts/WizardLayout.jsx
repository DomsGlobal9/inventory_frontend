import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { RotateCcw, X } from 'lucide-react';
import { useProduct } from '../context/ProductContext';

const STEPS = [
  { id: 'general', num: 1, label: 'General Information' },
  { id: 'measurements', num: 2, label: 'Measurements' },
  { id: 'upload', num: 3, label: 'Upload Photos' }
];

export default function WizardLayout({ title, subtitle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentStep = location.pathname.includes('upload') ? 3 :
                      location.pathname.includes('measurements') ? 2 : 1;

  /*
   * `|| {}` because this is a LAYOUT.
   *
   * A component that destructures straight off a context crashes the whole subtree the moment
   * the context is momentarily undefined -- which happens during a hot reload in development,
   * and would happen in production to anyone who ever rendered this outside the provider. A
   * blank wizard is a far worse outcome than a wizard with no restore banner for one frame.
   */
  const { restored, dismissRestored, resetProductData, rememberStep } = useProduct() || {};

  /*
   * Which step to come back to.
   *
   * Recorded here rather than in each step, so a step added later cannot forget to do it --
   * and read from the URL, which is the one thing that is already true about where they are.
   */
  const stepId = STEPS.find(s => s.num === currentStep)?.id ?? 'general';
  useEffect(() => { rememberStep?.(stepId); }, [stepId, rememberStep]);

  const startFresh = () => {
    resetProductData?.();
    navigate('/add/general');
  };

  return (
    <div className="mobile-col mobile-no-scroll" style={{ display: 'flex', flexDirection: 'row', gap: '32px', maxWidth: '1400px', margin: '0 auto', width: '100%', flex: 1, overflow: 'hidden' }}>
      
      {/* Left Sidebar Wizard Progress */}
      <div className="wizard-sidebar" style={{ 
        flexShrink: 0,
        display: 'flex', 
        flexDirection: 'column', 
        gap: '48px', 
        borderRight: '1px solid var(--border-light)', 
        paddingRight: '24px', 
        paddingTop: '16px'
      }}>
        <style>{`
          .wizard-sidebar { width: 250px; }
          .wizard-stepper-horizontal { display: none; }
          @media (max-width: 768px) {
            .wizard-sidebar { 
              width: 100%; 
              border-right: none; 
              border-bottom: 1px solid var(--border-light); 
              padding-bottom: 12px; 
              gap: 16px;
              position: sticky;
              top: 0;
              background: var(--bg-card);
              z-index: 10;
              margin-top: -16px;
              padding-top: 16px;
            }
            .wizard-stepper-vertical { display: none !important; }
            .wizard-stepper-horizontal { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; margin-right: -12px; padding-right: 12px; }
            .wizard-header-title { display: none; }
            .wizard-content { padding-top: 16px !important; }
          }
        `}</style>
        <header className="wizard-header-title">
          <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>{title}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>{subtitle}</p>
        </header>

        {/* Vertical Stepper (Desktop) */}
        <div className="wizard-stepper-vertical" style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative' }}>
          <div style={{
            position: 'absolute', top: '20px', bottom: '20px', left: '19px', width: '2px', backgroundColor: 'var(--border-light)', zIndex: 0
          }} />
          {STEPS.map(step => {
            const isActive = step.num === currentStep;
            const isPast = step.num < currentStep;
            const isClickable = isPast || isActive;

            return (
              <div
                key={step.id}
                onClick={() => isClickable && navigate(`/add/${step.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 1, cursor: isClickable ? 'pointer' : 'default' }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  backgroundColor: isActive || isPast ? 'var(--text-primary)' : 'var(--bg-card)',
                  color: isActive || isPast ? 'var(--bg-dark)' : 'var(--text-secondary)',
                  border: `2px solid ${isActive || isPast ? 'var(--text-primary)' : 'var(--border-light)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '500', fontSize: '16px', flexShrink: 0
                }}>
                  {isPast ? '✓' : step.num}
                </div>
                <span style={{ fontSize: '15px', fontWeight: isActive ? '500' : '400', color: isActive || isPast ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Horizontal Stepper (Mobile) */}
        <div className="wizard-stepper-horizontal">
          {STEPS.map((step, idx) => {
            const isActive = step.num === currentStep;
            const isPast = step.num < currentStep;
            const isClickable = isPast || isActive;

            return (
              <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isClickable ? 'pointer' : 'default', opacity: isClickable ? 1 : 0.5 }} onClick={() => isClickable && navigate(`/add/${step.id}`)}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  backgroundColor: isActive || isPast ? 'var(--text-primary)' : 'var(--bg-card)',
                  color: isActive || isPast ? 'var(--bg-dark)' : 'var(--text-secondary)',
                  border: `2px solid ${isActive || isPast ? 'var(--text-primary)' : 'var(--border-light)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '12px', flexShrink: 0
                }}>
                  {isPast ? '✓' : step.num}
                </div>
                <span style={{ fontSize: '13px', fontWeight: isActive ? '600' : '500', color: isActive || isPast ? 'var(--text-primary)' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {step.label}
                </span>
                {idx < STEPS.length - 1 && (
                  <div style={{ width: '16px', height: '1px', backgroundColor: 'var(--border-light)' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Content Area */}
      <div className="wizard-content mobile-no-scroll" style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: 0, 
        overflowY: 'auto', 
        paddingRight: '8px', 
        paddingBottom: '32px', 
        paddingTop: '16px' 
      }}>
        {/*
          Said out loud, and undoable.

          Work coming back on its own is only reassuring if the person is told it happened --
          otherwise a half-filled form they do not remember filling reads as the app having
          muddled two products together. "Start fresh" is next to it because the other half of
          trusting it is being able to throw it away in one press.
        */}
        {restored && (
          <div role="status" style={{
            display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
            padding: '10px 14px', marginBottom: '16px', borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.10)', border: '1px solid rgba(16, 185, 129, 0.28)',
            color: 'var(--text-primary)', fontSize: '13px'
          }}>
            <RotateCcw size={15} style={{ color: 'var(--accent-success)', flexShrink: 0 }} />
            <span style={{ minWidth: 0 }}>
              Picked up where you left off. Everything you had entered is still here.
            </span>
            <span style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              <button type="button" className="btn-secondary" onClick={startFresh}
                style={{ padding: '5px 12px', fontSize: '12px' }}>
                Start fresh
              </button>
              <button type="button" onClick={dismissRestored} aria-label="Hide this message"
                style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <X size={15} />
              </button>
            </span>
          </div>
        )}
        <Outlet />
      </div>
    </div>
  );
}
