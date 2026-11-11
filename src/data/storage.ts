import type { State } from "../domain/types";
import { seed } from "./seed";
export const STORAGE_KEY = "grit-interviews-v1";
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function load(port: StoragePort): State {
  try {
    const raw = port.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw) as State;
      if (
        state.version === 1 &&
        Array.isArray(state.students) &&
        Array.isArray(state.attempts) &&
        Array.isArray(state.slots) &&
        Array.isArray(state.badges) &&
        Array.isArray(state.awards) &&
        Array.isArray(state.audit)
      )
        return state;
    }
  } catch {
    /* Corrupt or inaccessible storage falls back to a fresh demo. */
  }
  return seed();
}
export function save(port: StoragePort, state: State) {
  port.setItem(STORAGE_KEY, JSON.stringify(state));
}
