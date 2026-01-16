import React from "react";
import { useLocation, Link } from "react-router-dom";

const ErrorPage: React.FC = () => {
  const location = useLocation();
  const state: any = (location as any).state || {};
  const message = state?.message || state?.error || null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-xl text-center">
        <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
        <p className="mb-6 text-muted-foreground">We encountered an error while loading the page.</p>
        {message && (
          <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{String(message)}</div>
        )}
        <div className="space-x-2">
          <Link to="/" className="btn">Go home</Link>
          <a href="mailto:support@tribeyangu.online" className="btn btn-outline">Contact support</a>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
