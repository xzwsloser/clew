import type { ClewSseEvent } from '@clew/shared';

type EventListener = (event: ClewSseEvent) => void;

export class ClewEventBus {
  private seq = 0;
  private readonly listeners = new Set<EventListener>();
  private readonly recent: ClewSseEvent[] = [];
  private readonly maxRecent = 100;

  emit(
    type: ClewSseEvent['type'],
    correlationId: string,
    payload: Record<string, unknown>,
  ): ClewSseEvent {
    const event: ClewSseEvent = {
      seq: this.seq++,
      correlationId,
      type,
      timestamp: new Date().toISOString(),
      payload,
    };
    this.recent.push(event);
    if (this.recent.length > this.maxRecent) {
      this.recent.shift();
    }
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Isolate listener failures
      }
    }
    return event;
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  replaySince(lastSeq: number): ClewSseEvent[] {
    return this.recent.filter((e) => e.seq > lastSeq);
  }
}
