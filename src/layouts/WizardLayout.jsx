import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

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
              background: var(--bg-body);
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
        <Outlet />
      </div>
    </div>
  );
}
