/**
 * Android hardware / gesture back button handler hook and registry.
 *
 * Implements a hierarchical back navigation stack:
 * 1. Dismisses topmost open Radix Dialog / BottomSheet / Popover via synthetic Escape keydown.
 * 2. Executes registered handlers in priority (descending) and LIFO (newest first) order.
 * 3. Falls back to minimizing the app (`nativeApp.minimizeApp()`) when at the root destination.
 */
import { useEffect, useRef } from "react";
import { nativeApp, type AppPort } from "@/lib/app";

export type BackButtonHandler = () => boolean | void;

export type BackHandlerOptions = {
  /** If false, the handler is not added to the active registry. Defaults to true. */
  enabled?: boolean;
  /** Higher priority handlers execute first. Defaults to 0. */
  priority?: number;
};

type RegistryEntry = {
  id: number;
  handler: BackButtonHandler;
  priority: number;
  enabled: boolean;
};

let nextId = 1;
const registry: RegistryEntry[] = [];

/**
 * Attempts to dismiss the topmost open Radix overlay (BottomSheet, Popover) by dispatching
 * a cancelable Escape keydown event on document. Radix's DismissableLayer intercepts this
 * during the capture phase, prevents default, and dismisses itself.
 * Returns true if an overlay intercepted and canceled the event.
 */
export const dismissTopOverlay = (): boolean => {
  if (typeof document === "undefined") return false;
  const event = new KeyboardEvent("keydown", {
    key: "Escape",
    code: "Escape",
    bubbles: true,
    cancelable: true,
  });
  return !document.dispatchEvent(event);
};

/**
 * Registers a back button handler in the global stack.
 * Returns a disposer to remove the handler.
 */
export const registerBackHandler = (handler: BackButtonHandler, priority = 0): (() => void) => {
  const entry: RegistryEntry = {
    id: nextId++,
    handler,
    priority,
    enabled: true,
  };
  registry.push(entry);

  return () => {
    const idx = registry.findIndex((e) => e.id === entry.id);
    if (idx !== -1) {
      registry.splice(idx, 1);
    }
  };
};

/**
 * Executes the back button action through the navigation hierarchy.
 */
export const handleBackPress = async (
  app: Pick<AppPort, "minimizeApp"> = nativeApp,
): Promise<boolean> => {
  // 1. Try dismissing any open overlay (BottomSheet, Popover) first.
  if (dismissTopOverlay()) {
    return true;
  }

  // 2. Iterate through registered handlers in priority desc, then LIFO (id desc).
  const entries = [...registry]
    .filter((e) => e.enabled)
    .sort((a, b) => b.priority - a.priority || b.id - a.id);

  for (const entry of entries) {
    const result = entry.handler();
    if (result !== false) {
      return true;
    }
  }

  // 3. Root destination reached: minimize the app so it stays warm in the background.
  await app.minimizeApp();
  return true;
};

/**
 * Hook to register a back button handler while a component is mounted.
 */
export const useBackButton = (
  handler: BackButtonHandler,
  options: BackHandlerOptions = {},
): void => {
  const { enabled = true, priority = 0 } = options;
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    return registerBackHandler(() => handlerRef.current(), priority);
  }, [enabled, priority]);
};
