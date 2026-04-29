import React, { Component } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestSoftNavigate } from "@/utils/softNavigate";
import { reportRuntimeError } from "@/lib/errorReporting";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    if (import.meta.env.DEV) console.error("[ErrorBoundary]", error, errorInfo);
    reportRuntimeError(error, "ErrorBoundary");
  }

  handleRetry = () => {
    const isChunkError = this.state.error?.message &&
      /loading chunk|dynamically imported module|failed to fetch/i.test(this.state.error.message);
    if (isChunkError) {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    requestSoftNavigate("/", { replace: true });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-purple-50 to-gray-100 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 p-4">
          <div className="max-w-md w-full bg-white/80 dark:bg-white/10 backdrop-blur-xl rounded-2xl p-8 text-center border border-gray-200 dark:border-white/20 shadow-xl" role="alert" aria-live="assertive">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>

            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Oops! Something went wrong
            </h1>

            <p className="text-gray-600 dark:text-gray-300 mb-6">
              We&apos;re sorry, but something unexpected happened. Please try again.
            </p>

            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleRetry}>
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button variant="outline" onClick={this.handleGoHome}>
                <Home className="w-4 h-4" />
                Go Home
              </Button>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="mt-6 p-4 bg-black/30 rounded-lg text-left">
                <p className="text-red-400 text-sm font-mono">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
