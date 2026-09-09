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
