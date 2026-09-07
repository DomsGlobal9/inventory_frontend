import React from 'react';
import { motion } from 'framer-motion';

export default function PageLoader({ text = 'LOADING...', fullScreen = false }) {
  // A clean, minimal loader matching the requested design
  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const dotVariants = {
    initial: { y: 0, opacity: 0.4 },
    animate: {
      y: [0, -6, 0],
      opacity: [0.4, 1, 0.4],
      transition: {
        duration: 0.8,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const containerStyle = fullScreen ? {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-dark)'
  } : {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    height: '100%',
    minHeight: '150px'
  };

  return (
    <div style={containerStyle}>
      <motion.div 
        variants={containerVariants} 
        initial="initial" 
        animate="animate" 
        style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}
      >
        <motion.div variants={dotVariants} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--text-secondary)' }} />
        <motion.div variants={dotVariants} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--text-secondary)' }} />
        <motion.div variants={dotVariants} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--text-secondary)' }} />
      </motion.div>

      <div style={{ 
        color: 'var(--text-secondary)', 
        fontSize: '12px', 
        fontWeight: '600', 
        letterSpacing: '0.2em', 
        textTransform: 'uppercase' 
      }}>
        {text}
      </div>
    </div>
  );
}
