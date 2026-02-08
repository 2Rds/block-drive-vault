import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h1>
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred. Your data is safe.
              </p>
            </div>
            {this.state.error && (
              <pre className="text-xs text-muted-foreground/60 font-mono bg-muted/20 border border-border/50 rounded-lg p-3 text-left overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={this.handleReset}>
                Try again
              </Button>
              <Button onClick={this.handleReload}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
