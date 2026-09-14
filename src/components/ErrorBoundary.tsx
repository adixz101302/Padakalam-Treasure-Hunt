"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Wifi } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isOnline: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isOnline: true };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught UI crash:", error, errorInfo);
  }

  componentDidMount() {
    // Track online/offline status
    const handleOnline = () => this.setState({ isOnline: true });
    const handleOffline = () => this.setState({ isOnline: false });
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    this.setState({ isOnline: navigator.onLine });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleFullReload = () => {
    window.location.reload();
  };

  render() {
    // Offline fallback screen
    if (!this.state.isOnline && !this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070A11] flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-[#0F172A]/90 border-2 border-amber-500/30 rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <div className="inline-flex items-center justify-center p-4 bg-amber-500/10 rounded-full border border-amber-400/30 mb-5">
              <Wifi className="w-10 h-10 text-amber-400 animate-pulse" />
            </div>
            <h2 className="text-xl font-mono font-black text-white uppercase tracking-wider mb-2">
              NO SIGNAL
            </h2>
            <p className="text-sm font-mono text-slate-400 mb-6">
              Your phone lost internet connection. Move to better signal and the app will auto-reconnect.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              WAITING FOR CONNECTION...
            </div>
            <p className="mt-6 text-xs font-mono text-slate-600">
              Don&apos;t worry — your progress is saved on the server. Nothing is lost.
            </p>
          </div>
        </div>
      );
    }

    // Error crash recovery screen
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070A11] flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-[#0F172A]/90 border-2 border-rose-500/30 rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <div className="inline-flex items-center justify-center p-4 bg-rose-500/10 rounded-full border border-rose-400/30 mb-5">
              <AlertTriangle className="w-10 h-10 text-rose-400" />
            </div>
            <h2 className="text-xl font-mono font-black text-white uppercase tracking-wider mb-2">
              {this.props.fallbackTitle || "SOMETHING WENT WRONG"}
            </h2>
            <p className="text-sm font-mono text-slate-400 mb-6">
              A display error occurred. Your hunt progress is safe on the server. Tap below to recover instantly.
            </p>
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-mono font-black text-sm uppercase rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                RETRY INSTANTLY
              </button>
              <button
                onClick={this.handleFullReload}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono font-bold text-xs uppercase rounded-xl transition cursor-pointer"
              >
                FULL PAGE RELOAD
              </button>
            </div>
            <p className="mt-5 text-xs font-mono text-slate-600 break-all">
              {this.state.error?.message || "Unknown error"}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
