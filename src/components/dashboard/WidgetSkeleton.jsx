import React from 'react';
import { motion } from 'framer-motion';

export default function WidgetSkeleton({ height = '400px' }) {
  return (
    <div className="stat-card" style={{ height, display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <motion.div 
          style={{ width: '150px', height: '24px', backgroundColor: 'var(--bg-hover)', borderRadius: '4px' }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      
      {/* Body skeleton lines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, marginTop: '8px' }}>
        {[...Array(5)].map((_, i) => (
          <motion.div 
            key={i}
            style={{ width: '100%', height: '48px', backgroundColor: 'var(--bg-hover)', borderRadius: '8px' }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
          />
        ))}
      </div>
    </div>
  );
}
