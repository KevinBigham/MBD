import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logger } from '@/shared/lib/logger';

const IS_DEV = (import.meta as unknown as { env: { DEV: boolean } }).env.DEV;

interface ErrorBoundaryProps {
  children: ReactNode;
  contextLabel?: string;
  recoveryLabel?: string;
  onRecover?: () => void;
  showBugLink?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    const contextLabel = this.props.contextLabel ?? 'Application Shell';
    logger.error(`ErrorBoundary caught an error in ${contextLabel}:`, error, info);
  }

  private handleReload = () => {
    if (this.props.onRecover) {
      this.props.onRecover();
      return;
    }

    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-dynasty-base p-8">
          <div className="w-full max-w-lg rounded-lg border border-accent-danger bg-dynasty-surface p-8">
            <div className="mb-6 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-accent-danger" />
              <h1 className="font-heading text-2xl font-bold text-dynasty-textBright">
                Something went wrong
              </h1>
            </div>

            <p className="mb-4 text-sm text-dynasty-muted">
              The application encountered an unexpected error. Your save data is
              safe in local storage.
            </p>

            {this.state.error && IS_DEV && (
              <div className="mb-6 overflow-auto rounded border border-dynasty-border bg-dynasty-base p-4">
                <pre className="font-data text-xs text-accent-danger">
                  {this.state.error.message}
                </pre>
                {this.state.error.stack && (
                  <pre className="mt-2 font-data text-xs text-dynasty-muted">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReload}
                className="focus-ring flex items-center gap-2 rounded-md bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white transition-colors hover:bg-accent-primaryHover"
              >
                <RefreshCw className="h-4 w-4" />
                {this.props.recoveryLabel ?? 'Reload Application'}
              </button>
              {this.props.showBugLink !== false ? (
                <a
                  href="https://github.com/KevinBigham/MBD/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring flex items-center gap-2 rounded-md border border-dynasty-border px-4 py-2 font-heading text-sm text-dynasty-muted transition-colors hover:border-dynasty-muted hover:text-dynasty-text"
                >
                  Report Bug
                </a>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
