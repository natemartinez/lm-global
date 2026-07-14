import { Component } from 'react';

/**
 * ErrorBoundary — catches JavaScript errors anywhere in its child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the whole app.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <MyComponent />
 *   </ErrorBoundary>
 *
 * Or with a custom fallback:
 *   <ErrorBoundary fallback={<div role="alert">Custom error message</div>}>
 *     <MyComponent />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Future: send to error reporting service (e.g., Sentry)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          style={{
            padding: '2rem',
            textAlign: 'center',
            borderRadius: '12px',
            backgroundColor: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#0b0c10' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#64748b', marginBottom: '1rem' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              padding: '0.5rem 1.5rem',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#01F0D0',
              color: '#072635',
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
