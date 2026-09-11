import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import TopNav from '../components/TopNav';
import Sidebar from '../components/Sidebar';
import ImpersonationBanner from '../components/ImpersonationBanner';

export default function MainLayout() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <ImpersonationBanner />
      <div className="app-container">
        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <Sidebar isOpen={isMobileMenuOpen} />
        <div className="content-wrapper">
          <TopNav onMenuClick={() => setIsMobileMenuOpen(true)} />
          <main className="main-content" id="main-scroll-container">
            {/*
              No AnimatePresence, and no exit animation, on purpose.

              This was <AnimatePresence mode="wait"> around a motion.div keyed on the path.
              `mode="wait"` means exactly this: do not mount the incoming page until the
              outgoing one has FINISHED animating out. That is a promise the layout cannot
              keep. If the exit never completes -- a second navigation inside the 200ms, a
              re-render interrupting the sequence, a background tab whose frames the browser
              has throttled -- the old page is already gone and the new one is never mounted.

              What that looks like is the content area going blank while the sidebar and the
              header, which live outside it, carry on as normal. Nothing throws, so nothing
              is logged and no error boundary fires; the app is simply waiting. Every later
              navigation is blank too, because it is still waiting, and only a full reload
              clears it by remounting the whole thing. Reported from production on a product
              page, then on every page after it.

              Nothing here withholds a page any more: the new one mounts immediately and
              fades in on its own. That also takes 200ms off every navigation in the app,
              which was the price being paid for the fade that is now gone.
            */}
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="content-container"
            >
              <Outlet />
            </motion.div>
          </main>
        </div>
      </div>
    </>
  );
}
