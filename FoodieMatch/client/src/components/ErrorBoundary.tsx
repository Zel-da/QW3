import React, { Component, ReactNode, ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary 컴포넌트
 * React 컴포넌트 트리에서 발생하는 JavaScript 에러를 포착하여
 * 전체 앱이 크래시되는 것을 방지합니다.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 에러가 발생하면 상태를 업데이트하여 fallback UI를 렌더링
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 에러 정보를 로깅 (프로덕션 환경에서는 에러 로깅 서비스로 전송 가능)
    console.error('Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    // 에러 상태를 초기화하고 다시 시도
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    // 페이지 새로고침
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <div>
                  <CardTitle className="text-2xl">오류가 발생했습니다</CardTitle>
                  <CardDescription className="mt-2">
                    예상치 못한 오류가 발생했습니다. 아래 버튼을 클릭하여 다시 시도해주세요.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm font-semibold text-destructive">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer hover:text-foreground">
                        스택 트레이스 보기
                      </summary>
                      <pre className="mt-2 overflow-auto whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={this.handleReset} variant="default">
                  다시 시도
                </Button>
                <Button onClick={this.handleReload} variant="outline">
                  페이지 새로고침
                </Button>
                <Button onClick={() => window.location.href = '/'} variant="ghost">
                  홈으로 이동
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
