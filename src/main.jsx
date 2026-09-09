import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { installGlobalErrorReporting } from './lib/errorReporter.js';
import { shouldRetry } from './lib/access.js';

installGlobalErrorReporting();

const queryClient = new QueryClient({
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
