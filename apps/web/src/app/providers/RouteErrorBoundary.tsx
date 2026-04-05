import { type ReactNode, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { useGameStore } from '@/shared/hooks/useGameStore';

interface RouteErrorBoundaryProps {
  children: ReactNode;
  routeLabel: string;
}

export function RouteErrorBoundary({ children, routeLabel }: RouteErrorBoundaryProps) {
  const navigate = useNavigate();
  const isInitialized = useGameStore((state) => state.isInitialized);
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  return (
    <ErrorBoundary
      key={retryCount}
      contextLabel={routeLabel}
      recoveryLabel={isInitialized ? 'Return to Dashboard' : 'Return to Save Hub'}
      onRecover={() => navigate(isInitialized ? '/dashboard' : '/', { replace: true })}
      onRetry={handleRetry}
    >
      {children}
    </ErrorBoundary>
  );
}
