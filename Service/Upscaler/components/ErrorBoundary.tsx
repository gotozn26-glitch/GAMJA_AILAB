import React from 'react';
import { AlertCircle } from 'lucide-react';

type Props = {
  children: React.ReactNode;
  /** Shown in the fallback heading (e.g. "결과 미리보기"). */
  label?: string;
  onReset?: () => void;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', this.props.label ?? 'panel', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold">
                {this.props.label ? `${this.props.label} 렌더 오류` : '화면 렌더 오류'}
              </p>
              <p className="mt-1 break-words text-xs font-medium">{this.state.error.message}</p>
              <button
                type="button"
                onClick={this.handleReset}
                className="mt-3 text-xs font-bold underline underline-offset-2 hover:text-amber-950"
              >
                이 영역 다시 표시
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
