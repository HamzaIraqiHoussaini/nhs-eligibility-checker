import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      const title = this.props.fallbackTitle || 'Unable to display this view';
      const message =
        this.props.fallbackMessage ||
        'An unexpected error occurred while loading this component. Your data remains safe.';

      return (
        <div
          className="sharp-card"
          style={{
            margin: '2rem auto',
            maxWidth: '640px',
            padding: '2.5rem 2rem',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderLeft: '4px solid var(--color-terracotta)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              backgroundColor: '#FEF2F2',
              borderRadius: '50%',
              color: 'var(--color-terracotta)',
              marginBottom: '1rem',
            }}
          >
            <AlertTriangle size={24} />
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.4rem',
              color: 'var(--color-navy)',
              margin: '0 0 0.5rem',
            }}
          >
            {title}
          </h2>

          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              margin: '0 0 1.5rem',
            }}
          >
            {message}
          </p>

          {this.state.error && (
            <div
              style={{
                marginBottom: '1.5rem',
                textAlign: 'left',
                backgroundColor: 'var(--color-canvas)',
                border: '1px solid var(--color-border)',
                padding: '0.75rem 1rem',
                fontSize: '0.78rem',
                fontFamily: 'monospace',
                color: 'var(--color-text-muted)',
                maxHeight: '120px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {this.state.error.message}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              className="btn-primary"
              onClick={this.handleReset}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} /> Try Again
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/dashboard';
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Home size={14} /> Return to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
