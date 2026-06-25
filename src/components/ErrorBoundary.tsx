"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  countdown: number;
}

export default class ErrorBoundary extends Component<Props, State> {
  private timer: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, countdown: 10 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, countdown: 10 };
  }

  componentDidCatch(error: Error) {
    console.error("ErrorBoundary caught an error:", error);
    this.startCountdown();
  }

  startCountdown = () => {
    this.timer = setInterval(() => {
      this.setState((prevState) => {
        if (prevState.countdown <= 1) {
          if (this.timer) clearInterval(this.timer);
          window.location.href = "/dashboard";
          return prevState;
        }
        return { hasError: prevState.hasError, error: prevState.error, countdown: prevState.countdown - 1 };
      });
    }, 1000);
  };

  componentWillUnmount() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  resetError = () => {
    if (this.timer) clearInterval(this.timer);
    this.setState({ hasError: false, error: null, countdown: 10 });
    window.location.reload();
  };

  goHome = () => {
    if (this.timer) clearInterval(this.timer);
    window.location.href = "/dashboard";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center p-4 relative overflow-hidden">
          {/* Background elements */}
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-red-600/10 blur-[120px] rounded-full pointer-events-none" />

          <div className="max-w-md w-full bg-white/5 backdrop-blur-xl rounded-[2rem] p-8 border border-red-500/20 text-center relative z-10 shadow-2xl shadow-red-500/10">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/30 mb-6">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">حدث عطل مؤقت</h1>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              لقد واجهنا مشكلة غير متوقعة، لكن لا داعي للقلق — النظام الديناميكي قيد العمل. سيتم إعادتك للوحة القيادة تلقائياً.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={this.resetError}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                <span>إعادة المحاولة الآن</span>
              </button>

              <button
                onClick={this.goHome}
                className="w-full py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                <span>العودة للوحة القيادة ({this.state.countdown}ث)</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
