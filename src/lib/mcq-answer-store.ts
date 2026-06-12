import { useSyncExternalStore } from "react";

type Key = string;
const store = new Map<Key, "A" | "B" | "C" | "D">();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function makeKey(messageId: string, index: number) {
  return `${messageId}::${index}`;
}

export function useMcqAnswer(messageId: string, index: number) {
  const key = makeKey(messageId, index);
  const selected = useSyncExternalStore(
    subscribe,
    () => store.get(key) ?? null,
    () => null,
  );
  const setSelected = (val: "A" | "B" | "C" | "D") => {
    if (store.has(key)) return; // single attempt
    store.set(key, val);
    emit();
  };
  return [selected, setSelected] as const;
}

export function clearMcqAnswers() {
  store.clear();
  emit();
}
