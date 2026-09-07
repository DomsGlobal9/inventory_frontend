import React from 'react';
import { motion } from 'framer-motion';

export default function SummaryCard({ title, value, note, icon: Icon, colorClass, bgColorClass, onClick }) {
  return (
    <motion.div 
      className="stat-card" 
      onClick={onClick}
      style={{ 
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background-color 0.2s',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '24px'
      }}
      whileHover={onClick ? { scale: 1.02 } : {}}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        if (onClick) e.currentTarget.style.backgroundColor = 'var(--bg-card)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '12px', 
            fontWeight: '500', 
            marginBottom: '8px', 
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {title}
          </p>
          <h2 style={{ fontSize: '32px', margin: 0, fontWeight: '600', color: 'var(--text-primary)' }}>
            {value}
          </h2>
          {/* Says why a figure is lower than the shopkeeper expects. A number that is quietly
              incomplete is worse than one that explains itself. */}
          {note && (
            <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: 'var(--text-muted, var(--text-secondary))', lineHeight: 1.4 }}>
              {note}
            </p>
          )}
        </div>
        <div 
          className="stat-icon-wrapper" 
          style={{ 
            backgroundColor: bgColorClass || 'rgba(255, 255, 255, 0.05)', 
            color: colorClass || 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '12px'
          }}
        >
          {Icon && <Icon size={20} />}
        </div>
      </div>
    </motion.div>
  );
}
