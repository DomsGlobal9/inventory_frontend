import React, { createContext, useContext, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

const ThemeContext = createContext();

/** How long the new theme takes to spread across the screen. */
const WIPE_MS = 600;

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('scale_easy_theme');
    // Default to light theme as requested
    return saved || 'light';
  });

  useEffect(() => {
    localStorage.setItem('scale_easy_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  /**
   * Switch light/dark. Given the click, the new theme spreads out as a circle from the button that was
   * pressed (View Transitions): the browser photographs the screen before and after, and the "after"
   * picture is revealed through a growing circle. A browser without it, or someone who asked their device
   * for less motion, simply gets the switch.
   */
  const toggleTheme = (event) => {
    const root = document.documentElement;
    const apply = () => {
      // Read at the moment of switching, not at the click: two quick clicks must end where they began.
      const next = (root.getAttribute('data-theme') || theme) === 'dark' ? 'light' : 'dark';
      // Set straight on the page as well: the "after" picture is taken the moment this returns.
      root.setAttribute('data-theme', next);
      flushSync(() => setTheme(next));
    };
    const lessMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (typeof document.startViewTransition !== 'function' || lessMotion) { apply(); return; }

    const box = event?.currentTarget?.getBoundingClientRect?.();
    const x = box ? box.left + box.width / 2 : event?.clientX ?? window.innerWidth - 40;
    const y = box ? box.top + box.height / 2 : event?.clientY ?? 40;
    // Far enough to reach the furthest corner of the screen.
    const end = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    // theme-wipe: freezes colour transitions while the pictures are taken (a half-faded card would
    // otherwise be photographed mid-fade), and scopes the wipe styles in index.css to this switch only.
    root.classList.add('theme-wipe');
    const transition = document.startViewTransition(apply);
    transition.ready
      .then(() => root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: WIPE_MS, easing: 'cubic-bezier(.65, 0, .35, 1)', pseudoElement: '::view-transition-new(root)' }
      ))
      .catch(() => { /* the switch itself has happened; only the flourish was skipped */ });
    transition.finished.finally(() => root.classList.remove('theme-wipe'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
