import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';

const STEPS = [
  { id: 'general', num: 1, label: 'General Information' },
  { id: 'measurements', num: 2, label: 'Measurements' },
  { id: 'upload', num: 3, label: 'Upload Photos' }
];

export default function WizardLayout({ title, subtitle }) {
  const location = useLocation();
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
          @media (max-width: 768px) {
            .wizard-sidebar { width: 100%; border-right: none; border-bottom: 1px solid var(--border-light); padding-bottom: 24px; }
          }
        `}</style>
        <header>
          <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>{title}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>{subtitle}</p>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative' }}>
          {/* Vertical connecting line */}
          <div style={{
            position: 'absolute',
            top: '20px',
            bottom: '20px',
            left: '19px',
            width: '2px',
            backgroundColor: 'var(--border-light)',
            zIndex: 0
          }} />

          {STEPS.map(step => {
            const isActive = step.num === currentStep;
            const isPast = step.num < currentStep;
            
            return (
              <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: isActive || isPast ? 'var(--text-primary)' : 'var(--bg-card)',
                  color: isActive || isPast ? 'var(--bg-dark)' : 'var(--text-secondary)',
                  border: `2px solid ${isActive || isPast ? 'var(--text-primary)' : 'var(--border-light)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '500',
                  fontSize: '16px',
                  flexShrink: 0
                }}>
                  {isPast ? '✓' : step.num}
                </div>
                <span style={{ 
                  fontSize: '15px', 
                  fontWeight: isActive ? '500' : '400',
                  color: isActive || isPast ? 'var(--text-primary)' : 'var(--text-secondary)' 
                }}>
                  {step.label}
                </span>
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
