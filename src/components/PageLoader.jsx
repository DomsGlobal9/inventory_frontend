import React from 'react';
import { motion } from 'framer-motion';

export default function PageLoader({ text = 'Loading...' }) {
  // A premium staggered dots animation
  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const dotVariants = {
    initial: { y: 0, opacity: 0.3, scale: 0.8 },
    animate: { 
      y: [0, -10, 0], 
      opacity: [0.3, 1, 0.3],
      scale: [0.8, 1, 0.8],
      transition: { 
        duration: 1.5, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100%', 
      minHeight: '200px',
      color: 'var(--text-secondary)'
    }}>
      
      {/* Animated visual element */}
      <motion.div 
        variants={containerVariants}
        initial="initial"
        animate="animate"
        style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}
      >
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            variants={dotVariants}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: index === 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: index === 1 ? '0 0 12px rgba(255, 255, 255, 0.4)' : 'none'
            }}
          />
        ))}
      </motion.div>

      {/* Futuristic scanning text effect */}
      <motion.div style={{ position: 'relative', overflow: 'hidden', padding: '0 8px' }}>
        <motion.p 
          style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            letterSpacing: '2px', 
            textTransform: 'uppercase',
            margin: 0,
            background: 'linear-gradient(90deg, var(--text-muted) 0%, var(--text-primary) 50%, var(--text-muted) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '200% auto',
          }}
          animate={{ backgroundPosition: ['200% center', '-200% center'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          {text}
        </motion.p>
      </motion.div>
      
    </div>
  );
}
