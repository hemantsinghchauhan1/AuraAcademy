"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertOctagon, RotateCcw, Home } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("─── AuraAcademy Uncaught Error boundary ───");
    console.error("Error details:", error);
    console.error("Component stack trace:", errorInfo.componentStack);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#040406] px-4 py-12">
          <div className="glass-panel p-8 max-w-md w-full rounded-2xl border border-red-500/10 text-center space-y-6">
            
            {/* Header Red Circle */}
            <div className="h-16 w-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto">
              <AlertOctagon className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-extrabold text-white">Something went wrong</h1>
              <p className="text-xs text-gray-500 leading-relaxed">
                An unexpected rendering error occurred inside your workspace. Our monitoring suite has logged the exception details.
              </p>
            </div>

            {/* Error Message Detail Box */}
            <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-[10px] text-red-400 font-mono text-left break-words overflow-auto max-h-24">
              {this.state.error?.message || "Render stack overflow or dynamic component hydration mismatch."}
            </div>

            {/* Buttons list */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reload Page</span>
              </button>
              <a
                href="/dashboard"
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold transition-all"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Workspace</span>
              </a>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
