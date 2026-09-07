import React from 'react';
import { motion } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import { ShieldCheck, Zap, ArrowRight, CheckCircle2, BarChart3, Users, Box, RefreshCw } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  // Someone already signed in has no use for the sales pitch, and being shown it is
  // indistinguishable from having been signed out. Wait for the session check first, so a
  // signed-in visitor is not flashed the marketing page on every reload.
  const { isAuthenticated, isLoading } = useAuth();
  if (!isLoading && isAuthenticated) return <Navigate to="/dashboard" replace />;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-dark)', height: '100vh', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Helmet>
        <title>Scaleezy Inventory - The Ultimate Retail OS</title>
        <meta name="description" content="Scaleezy Inventory - The definitive platform for scaling your business, tracking multi-client stock, and optimizing operations." />
        <meta name="keywords" content="inventory management, POS, scaleezy, scaleezy inventory, business scaling, stock control, real-time inventory" />
        <meta property="og:title" content="Scaleezy Inventory" />
        <meta property="og:description" content="Streamline your operations with our immutable inventory ledger and modern point-of-sale platform." />
      </Helmet>

      {/* Navigation */}
      <nav style={{ padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-dark)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/scaleezy-logo.png" alt="Scaleezy Logo" style={{ height: '48px', objectFit: 'contain' }} />
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link to="/login" className="btn-secondary">Log In</Link>
          <Link to="/signup" className="btn-primary">Get Started</Link>
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Hero Section */}
        <section style={{ padding: 'clamp(80px, 15vw, 140px) 24px', textAlign: 'center', maxWidth: '1000px', margin: '0 auto' }}>
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <motion.h1 variants={itemVariants} style={{ fontSize: 'clamp(40px, 8vw, 64px)', fontWeight: 800, marginBottom: '24px', lineHeight: 1.1, color: 'var(--text-primary)' }}>
              Total stock control. <br />
              <span style={{ color: 'var(--accent-gold)' }}>Effortless scaling.</span>
            </motion.h1>
            <motion.p variants={itemVariants} style={{ fontSize: 'clamp(18px, 4vw, 22px)', color: 'var(--text-secondary)', marginBottom: '48px', maxWidth: '650px', margin: '0 auto 48px auto', lineHeight: 1.6 }}>
              Scaleezy Inventory is the definitive operating system for modern retail. Say goodbye to spreadsheet chaos and hello to an immutable ledger and real-time insights.
            </motion.p>
            <motion.div variants={itemVariants} style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <Link to="/signup" className="btn-primary" style={{ padding: '16px 36px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                Start for free <ArrowRight size={20} />
              </Link>
              <Link to="/login" className="btn-secondary" style={{ padding: '16px 36px', fontSize: '18px' }}>
                Live Demo
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* How It Works Section */}
        <section style={{ padding: 'clamp(50px, 10vw, 80px) 24px', backgroundColor: 'var(--bg-dark)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 36px)', fontWeight: 700, marginBottom: '48px', color: 'var(--text-primary)' }}>How Scaleezy Works</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px' }}>
              {[
                { step: '01', title: 'Connect Your Catalog', desc: 'Import or create your product variants with our lightning-fast setup wizard.' },
                { step: '02', title: 'Track Every Movement', desc: 'Our immutable ledger ensures you never lose a single unit to unrecorded errors.' },
                { step: '03', title: 'Scale Without Limits', desc: 'Add users, configure advanced roles, and let Scaleezy handle the rest.' }
              ].map((step, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
                >
                  <div style={{ fontSize: '48px', fontWeight: 900, color: 'var(--border-focus)' }}>{step.step}</div>
                  <h3 style={{ fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 600, color: 'var(--text-primary)' }}>{step.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: '280px' }}>{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section style={{ padding: 'clamp(60px, 10vw, 100px) 24px', backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '80px' }}>
              <h2 style={{ fontSize: 'clamp(32px, 6vw, 42px)', fontWeight: 800, marginBottom: '20px', color: 'var(--text-primary)' }}>Engineered for Growth</h2>
              <p style={{ fontSize: '20px', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>Scaleezy replaces scattered tools with one unified, highly reliable platform.</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
              {[
                { icon: <ShieldCheck size={28} color="var(--accent-success)" />, title: 'Immutable Ledger', desc: 'Every stock movement is recorded permanently. No silent overwrites, full audit trails.' },
                { icon: <Zap size={28} color="var(--accent-gold)" />, title: 'Real-time Tracking', desc: 'Eagle-eye dashboard analytics give you live stock levels, sales, and alerts.' },
                { icon: <BarChart3 size={28} color="var(--text-primary)" />, title: 'Advanced Reporting', desc: 'Track average costs, margin percentages, and detailed historical day books.' },
                { icon: <Users size={28} color="var(--accent-gold)" />, title: 'Multi-Tenant Ready', desc: 'Enterprise-grade isolation allowing platform administration with extreme safety.' },
                { icon: <Box size={28} color="var(--accent-success)" />, title: 'Smart Procurement', desc: 'End-to-end purchase order workflows. Reorder stock before you run out.' },
                { icon: <RefreshCw size={28} color="var(--text-primary)" />, title: 'Returns & Dispatches', desc: 'A dedicated state machine for orders, shipping, and processing complicated returns.' }
              ].map((feat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="glass-panel" 
                  style={{ padding: '36px', display: 'flex', flexDirection: 'column', gap: '16px', transition: 'transform 0.3s ease' }}
                  whileHover={{ y: -5 }}
                >
                  <div style={{ width: '56px', height: '56px', borderRadius: '14px', backgroundColor: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {feat.icon}
                  </div>
                  <h3 style={{ fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 600, color: 'var(--text-primary)' }}>{feat.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>{feat.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Value Prop Section */}
        <section style={{ padding: 'clamp(70px, 12vw, 120px) 24px', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '64px', alignItems: 'center' }}>
          <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} style={{ flex: '1 1 400px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 38px)', fontWeight: 800, marginBottom: '24px', color: 'var(--text-primary)', lineHeight: 1.2 }}>Ready to transform your operations?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '18px', marginBottom: '32px', lineHeight: 1.6 }}>
              Join the growing list of forward-thinking retailers who have switched to Scaleezy.
            </p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '20px', listStyle: 'none', padding: 0 }}>
              {['Lightning fast onboarding', 'Complete auditability & security', '24/7 dedicated platform support'].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '18px', color: 'var(--text-primary)', fontWeight: 500 }}>
                  <CheckCircle2 color="var(--accent-success)" size={26} />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} style={{ flex: '1 1 400px' }} className="glass-panel">
            <div style={{ padding: '48px', textAlign: 'center' }}>
                <img src="/scaleezy-logo.png" alt="Scaleezy" style={{ height: '56px', marginBottom: '32px', objectFit: 'contain' }} />
                <h3 style={{ fontSize: '26px', marginBottom: '16px', color: 'var(--text-primary)', fontWeight: 700 }}>Start your journey</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', fontSize: '16px' }}>Managing stock shouldn't be a guessing game. Take control today.</p>
                <Link to="/signup" className="btn-primary" style={{ display: 'block', padding: '18px', fontSize: '18px', fontWeight: 600 }}>Create Your Account</Link>
                <p style={{ marginTop: '20px', fontSize: '14px', color: 'var(--text-muted)' }}>No credit card required.</p>
            </div>
          </motion.div>
        </section>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-light)', padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
          <img src="/scaleezy-logo.png" alt="Scaleezy Logo" style={{ height: '40px', opacity: 0.5, filter: 'grayscale(100%)' }} />
          <p>© {new Date().getFullYear()} Scaleezy Inventory. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
