import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mb-5">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h1>
          <p className="text-sm text-muted-foreground mb-6">
            An unexpected error occurred. Please try refreshing the page or go back to the dashboard.
          </p>
          {this.state.error && (
            <div className="mb-6 bg-white border border-slate-200 rounded-lg p-3 text-left">
              <p className="text-xs font-medium text-muted-foreground mb-1">Error details</p>
              <p className="text-xs text-red-600 font-mono break-all leading-relaxed">
                {this.state.error.message}
              </p>
            </div>
          )}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh page
            </button>
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50 transition-colors"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}
