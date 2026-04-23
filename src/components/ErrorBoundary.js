import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('MilestoneGG Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', gap: 16, padding: 32,
          background: 'var(--bg-root)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 48 }}>⚠</div>
          <div style={{
            fontFamily: 'var(--font-hud)', fontSize: 18, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--red)',
          }}>Something went wrong</div>
          <div style={{ color: 'var(--text-3)', fontSize: 14, maxWidth: 400, lineHeight: 1.6 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button
              className="btn btn-primary"
              onClick={() => this.setState({ hasError: false, error: null })}
            >Try Again</button>
            <button
              className="btn btn-ghost"
              onClick={() => window.location.reload()}
            >Reload Page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
