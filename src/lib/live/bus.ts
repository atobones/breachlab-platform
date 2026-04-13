import type { LiveEvent } from "./events";

type Listener = (event: LiveEvent) => void;

class LiveBus {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  publish(event: LiveEvent): void {
    for (const l of this.listeners) {
      try {
        l(event);
      } catch {
        // swallow listener errors
      }
    }
  }
}

const globalKey = "__breachlab_live_bus__";
const g = globalThis as unknown as { [k: string]: LiveBus | undefined };
export const liveBus: LiveBus = g[globalKey] ?? (g[globalKey] = new LiveBus());
