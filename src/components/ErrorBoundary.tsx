import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public reset = () => {
    const isDynamicImportError = this.state.error?.message?.includes("dynamically imported module") || 
                                 this.state.error?.message?.includes("Failed to fetch");
    this.setState({ hasError: false, error: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    } else if (isDynamicImportError && typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-6 m-4 bg-red-50/80 border border-red-200 text-red-700 rounded-xl shadow-sm flex flex-col items-center justify-center text-center gap-3">
            <p className="font-semibold text-base">Đã xảy ra sự cố khi tải nội dung phần này.</p>
            <p className="text-xs text-red-500 max-w-md">
              {this.state.error?.message || "Lỗi không xác định trong quá trình kết xuất giao diện."}
            </p>
            <button
              onClick={this.reset}
              className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              Thử tải lại trang
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

