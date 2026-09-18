/**
 * React Error Boundary for app screens and components.
 *
 * Prevents unhandled render errors (like missing chunks or runtime exceptions)
 * from crashing and unmounting the whole React root into a blank/black screen.
 * Displays a Design System EmptyState with a retry action.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { StateMessage } from "./StateMessage.tsx";
import { Button } from "@/ds";

export type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onReset?: () => void;
  title?: string;
  hint?: string;
  actionLabel?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Only log in non-test environments or when needed
    if (process.env.NODE_ENV !== "test") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  reset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function") {
        return this.state.error ? this.props.fallback(this.state.error, this.reset) : null;
      }
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }
      return (
        <div className="flex h-full flex-1 items-center justify-center p-4">
          <StateMessage
            icon="triangle-alert"
            title={this.props.title ?? "Kaut kas nogāja greizi"}
            hint={this.props.hint ?? "Neizdevās ielādēt šo skatu."}
            action={
              <Button size="sm" variant="outline" onClick={this.reset}>
                {this.props.actionLabel ?? "Mēģināt vēlreiz"}
              </Button>
            }
          />
        </div>
      );
    }
    return this.props.children;
  }
}
