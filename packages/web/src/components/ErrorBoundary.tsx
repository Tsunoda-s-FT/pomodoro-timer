import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * エラーバウンダリコンポーネント
 * 子コンポーネントでの未処理エラーをキャッチし、フォールバックUIを表示
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] エラーをキャッチしました:', error);
    console.error('[ErrorBoundary] コンポーネントスタック:', errorInfo.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div
            className="max-w-md w-full p-6 rounded-2xl text-center"
            style={{ backgroundColor: 'var(--background-secondary)' }}
          >
            <div className="text-4xl mb-4">😵</div>
            <h1
              className="text-xl font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              エラーが発生しました
            </h1>
            <p
              className="text-sm mb-4"
              style={{ color: 'var(--text-secondary)' }}
            >
              アプリケーションで予期しないエラーが発生しました。
            </p>
            {this.state.error && (
              <pre
                className="text-xs text-left p-3 rounded mb-4 overflow-auto max-h-32"
                style={{
                  backgroundColor: 'var(--background-primary)',
                  color: 'var(--text-tertiary)',
                }}
              >
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-90"
              style={{
                backgroundColor: 'var(--work-primary)',
                color: 'white',
              }}
            >
              再試行
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
