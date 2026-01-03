import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors in child components and displays
 * a friendly error UI with retry options.
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        // Log error to console (could send to error tracking service)
        console.error('[ErrorBoundary]', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
                    <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-2xl p-8 text-center border border-white/20">
                        <div className="w-16 h-16 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-2">
                            Oops! Something went wrong
                        </h1>

                        <p className="text-gray-300 mb-6">
                            We're sorry, but something unexpected happened. Please try again.
                        </p>

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleRetry}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                            </button>

                            <button
                                onClick={this.handleGoHome}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
                            >
                                <Home className="w-4 h-4" />
                                Go Home
                            </button>
                        </div>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
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
