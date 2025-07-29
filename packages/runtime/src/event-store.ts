// Import BaseEvent type when available from @ag-ui/core or @ag-ui/client
// For now, we'll keep the generic implementation that can work with any event type

/**
 * Event store for buffering and consuming events from AG-UI agents
 * @template T The type of events to store (defaults to any, but can be BaseEvent from AG-UI)
 */
export class EventStore<T = any> {
  private events: T[] = [];
  private isDone = false;
  private newEventCallbacks: Array<() => void> = [];

  /**
   * Write an event to the store
   */
  write(event: T): void {
    if (this.isDone) {
      throw new Error("Cannot write to a closed event store");
    }
    this.events.push(event);
    // Notify all waiting consumers
    this.newEventCallbacks.forEach(callback => callback());
    this.newEventCallbacks = [];
  }

  /**
   * Mark the writer as done - no more events will be written
   */
  done(): void {
    this.isDone = true;
    // Notify all waiting consumers that we're done
    this.newEventCallbacks.forEach(callback => callback());
    this.newEventCallbacks = [];
  }

  /**
   * Consume events as an async iterator
   * This will yield all existing events first, then wait for new events
   * until the writer calls done()
   */
  async *consume(): AsyncGenerator<T, void, unknown> {
    let index = 0;

    while (true) {
      // Yield all available events
      while (index < this.events.length) {
        yield this.events[index]!;
        index++;
      }

      // If writer is done and we've consumed all events, we're done
      if (this.isDone) {
        break;
      }

      // Wait for new events
      await new Promise<void>(resolve => {
        this.newEventCallbacks.push(resolve);
      });
    }
  }

  /**
   * Consume all events and return them as an array
   * This will wait until the writer calls done()
   */
  async consumeAll(): Promise<T[]> {
    const allEvents: T[] = [];
    for await (const event of this.consume()) {
      allEvents.push(event);
    }
    return allEvents;
  }

  /**
   * Check if the writer has finished
   */
  isComplete(): boolean {
    return this.isDone;
  }

  /**
   * Get the current count of events
   */
  size(): number {
    return this.events.length;
  }
}