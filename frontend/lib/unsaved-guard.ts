let dirty = false;
const listeners = new Set<(d: boolean) => void>();

export function setUnsaved(d: boolean) {
  if (dirty === d) return;
  dirty = d;
  listeners.forEach((l) => l(d));
}

export function isUnsaved() {
  return dirty;
}

export function subscribeUnsaved(fn: (d: boolean) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
