import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router-dom";
import { AlertTriangle, RefreshCw, ArrowLeft, Home } from "lucide-react";

export default function RouteError() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = "Something went wrong";
  let message = "An unexpected error occurred. Please try again.";
  let detail = "";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Page not found";
      message = "The page you're looking for doesn't exist or has been moved.";
    } else {
      title = `Error ${error.status}`;
      message = error.statusText || message;
    }
  } else if (error instanceof Error) {
    if (error.message.includes("Failed to fetch dynamically imported module")) {
      title = "Failed to load page";
      message = "This usually happens after an update. A quick refresh should fix it.";
    }
    detail = error.message;
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mb-5">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        {detail && (
          <div className="mb-6 bg-white border border-slate-200 rounded-lg p-3 text-left">
            <p className="text-xs font-medium text-muted-foreground mb-1">Error details</p>
            <p className="text-xs text-red-600 font-mono break-all leading-relaxed">{detail}</p>
          </div>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
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
