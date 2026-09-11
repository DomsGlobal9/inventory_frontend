import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import toast from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { installGlobalErrorReporting } from './lib/errorReporter.js';
import { shouldRetry, isPermissionError } from './lib/access.js';

installGlobalErrorReporting();

/**
 * A request that failed must not look like an empty shelf.
 *
 * Nothing surfaced a failed query. The interceptor rejects with a clean { message }, the
 * component reads `data?.x || []`, and the screen renders its empty state -- so "No
 * transactions found.", "No products added yet.", "No suppliers found." were printed with
 * equal confidence whether the answer was genuinely nothing or the request never succeeded.
 * Nineteen screens are built that way. That is not a rendering bug; it is the app telling a
 * shopkeeper something untrue about their own shop, quietly, with no way to tell.
 *
 * One handler here covers all of them, and every screen added later.
 *
 * Three refusals are deliberately silent, because something else already says more than a
 * toast could:
 *   - a permission refusal: Guard renders the page that explains it
 *   - a 401: the interceptor has already sent them to sign in
 *   - a 404: the screen itself says what was not found, in context
 *
 * Keyed on the message so a screen firing several queries at once reports a dropped
 * connection once, not five times.
 */
const queryCache = new QueryCache({
  onError: (error) => {
    if (isPermissionError(error)) return;
    const status = error?.response?.status ?? error?.statusCode;
    if (status === 401 || status === 404) return;
    const message = error?.message || 'Something did not load. Check your connection and try again.';
    toast.error(message, { id: `query:${message}` });
  }
});

const queryClient = new QueryClient({
  queryCache,
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // A refusal is not a blip. Retrying one doubles the requests and delays the moment the
      // screen settles into telling the person the truth -- see lib/access.
      retry: shouldRetry,

      // Treat data as good for half a minute.
      //
      // The default is zero, which means every screen refetches the moment it mounts. This
      // database is a round trip away -- measured at three to four seconds for a variants
      // call -- so moving Products -> Inventory -> Products showed a spinner three times for
      // numbers that had not changed.
      //
      // Thirty seconds is chosen against how this app is actually used: a shopkeeper moving
      // between screens while doing one task sees what they were just looking at, instantly;
      // anyone who leaves a screen open longer than that gets fresh data when they come back.
      // Anything a mutation changes is invalidated explicitly by its own hook regardless of
      // this, so a stale figure cannot survive an edit.
      staleTime: 30_000,

      // And keep it in memory a good while after nothing is watching it, so going back to a
      // screen paints from cache rather than from nothing.
      gcTime: 5 * 60_000,
    }
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <App />
            <Toaster position="bottom-right" />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
