import type { ReactNode } from 'react';
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

  return (
    <ErrorBoundary
      contextLabel={routeLabel}
      recoveryLabel={isInitialized ? 'Return to Dashboard' : 'Return to Save Hub'}
      onRecover={() => navigate(isInitialized ? '/dashboard' : '/', { replace: true })}
    >
      {children}
    </ErrorBoundary>
  );
}
