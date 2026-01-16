import React from 'react';
import { Navigate } from 'react-router-dom';

type State = {
  hasError: boolean;
  error?: any;
};

class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    // Optionally log to an external service here
    // console.error('Unhandled error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Navigate to="/error" state={{ message: String(this.state.error || 'An unexpected error occurred') }} replace />
      );
    }

    return this.props.children as React.ReactElement;
  }
}

export default ErrorBoundary;
