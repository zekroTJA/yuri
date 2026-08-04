import type { EventPayloadMap, EventType } from "./models";

type EventHandler<K extends EventType> = (data: EventPayloadMap[K]) => void;

type Unsubscribe = () => void;

// Wraps the /api/v1/events SSE stream, dispatching to handlers registered
// per event type. The server sends one named SSE event per EventType, so
// this maps directly onto EventSource's addEventListener API.
export class ApiEventStream {
  private readonly eventSource: EventSource;

  constructor(url: string) {
    this.eventSource = new EventSource(url, { withCredentials: true });
  }

  on<K extends EventType>(type: K, handler: EventHandler<K>): Unsubscribe {
    const listener = (ev: Event) => {
      const messageEvent = ev as MessageEvent<string>;
      const data = JSON.parse(messageEvent.data) as EventPayloadMap[K];
      handler(data);
    };

    this.eventSource.addEventListener(type, listener);
    return () => this.eventSource.removeEventListener(type, listener);
  }

  onError(handler: (ev: Event) => void): Unsubscribe {
    this.eventSource.addEventListener("error", handler);
    return () => this.eventSource.removeEventListener("error", handler);
  }

  onOpen(handler: (ev: Event) => void): Unsubscribe {
    this.eventSource.addEventListener("open", handler);
    return () => this.eventSource.removeEventListener("open", handler);
  }

  close(): void {
    this.eventSource.close();
  }
}
