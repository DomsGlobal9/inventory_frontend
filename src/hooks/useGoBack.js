import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * The on-screen back arrow, behaving like the browser's Back button.
 *
 * Every detail page's arrow used to go to one fixed list -- a product opened from a supplier's page
 * went "back" to Products, an order opened from a customer went "back" to Orders -- so the arrow
 * and the browser's Back disagreed, and the person lost their place (the user, 26 Oct).
 *
 * React Router numbers each entry it adds to the history (`history.state.idx`). Above 0 means
 * there is a page of OURS to return to, so we step back to it, wherever it was. At 0 the person
 * arrived straight here -- a new tab, a bookmark, a link in a message -- and stepping back would
 * leave the app, so the arrow goes to the page's own list instead, replacing this entry so that
 * pressing it again does not bounce between the two.
 */
export function useGoBack(fallback) {
  const navigate = useNavigate();
  return useCallback(() => {
    const idx = window.history.state?.idx;
    if (typeof idx === 'number' && idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}
