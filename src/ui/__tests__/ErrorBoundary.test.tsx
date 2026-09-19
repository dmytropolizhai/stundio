import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary.tsx";

const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test render error");
  }
  return <div>Healthy content</div>;
};

describe("ErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Normal content")).toBeTruthy();
  });

  it("catches render error and displays default error message with retry button", () => {
    // Suppress console.error in this test since throwing is expected
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Kaut kas nogāja greizi")).toBeTruthy();
    expect(screen.getByText("Neizdevās ielādēt šo skatu.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mēģināt vēlreiz" })).toBeTruthy();

    spy.mockRestore();
  });

  it("uses custom title, hint, and actionLabel when provided", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary title="Custom error title" hint="Custom hint text" actionLabel="Custom retry">
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Custom error title")).toBeTruthy();
    expect(screen.getByText("Custom hint text")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Custom retry" })).toBeTruthy();

    spy.mockRestore();
  });

  it("supports custom ReactNode fallback", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div>Custom fallback UI</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Custom fallback UI")).toBeTruthy();

    spy.mockRestore();
  });

  it("supports custom function fallback with error and reset handler", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary
        fallback={(error, reset) => (
          <div>
            <span>Error message: {error.message}</span>
            <button onClick={reset}>Reset</button>
          </div>
        )}
      >
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Error message: Test render error")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reset" })).toBeTruthy();

    spy.mockRestore();
  });

  it("calls onReset and re-renders children when retry button is pressed", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onReset = vi.fn();

    const Parent = () => {
      const [shouldThrow, setShouldThrow] = useState(true);
      return (
        <ErrorBoundary
          onReset={() => {
            onReset();
            setShouldThrow(false);
          }}
        >
          <ThrowingComponent shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    };

    render(<Parent />);

    expect(screen.getByText("Kaut kas nogāja greizi")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Mēģināt vēlreiz" }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Healthy content")).toBeTruthy();

    spy.mockRestore();
  });
});
