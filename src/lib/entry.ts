"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the visitor has clicked the ghost to enter.
 * The home page hides the menu until then. The answer lasts for the browser tab,
 * so coming back to Home in the same visit skips the gate, and a new visit sees it again.
 */

const KEY = "tmg:entered";
const listeners = new Set<() => void>();

function read() {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

let entered: boolean | null = null;

export function setEntered(value: boolean) {
  entered = value;
  try {
    if (value) sessionStorage.setItem(KEY, "1");
    else sessionStorage.removeItem(KEY);
  } catch {
    // Private mode or blocked storage: the gate simply shows again next visit
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useEntered() {
  return useSyncExternalStore(
    subscribe,
    () => (entered ??= read()),
    () => false,
  );
}
