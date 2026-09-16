import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
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

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || <div className="p-4 bg-red-50 text-red-600 rounded-lg">Đã xảy ra lỗi khi hiển thị nội dung.</div>;
    }

    return this.props.children;
  }
}
