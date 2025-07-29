import { describe, it, expect } from "vitest";
import { EventStore } from "../event-store";

describe("EventStore", () => {
  it("should write and consume events", async () => {
    const store = new EventStore<string>();
    
    // Write some events
    store.write("event1");
    store.write("event2");
    store.write("event3");
    store.done();
    
    // Consume all events
    const events = await store.consumeAll();
    expect(events).toEqual(["event1", "event2", "event3"]);
  });

  it("should support async consumption with iterator", async () => {
    const store = new EventStore<number>();
    const consumed: number[] = [];
    
    // Start consuming in the background
    const consumePromise = (async () => {
      for await (const event of store.consume()) {
        consumed.push(event);
      }
    })();
    
    // Write events with delays
    store.write(1);
    store.write(2);
    await new Promise(resolve => setTimeout(resolve, 10));
    store.write(3);
    store.done();
    
    // Wait for consumption to complete
    await consumePromise;
    
    expect(consumed).toEqual([1, 2, 3]);
  });

  it("should handle multiple consumers", async () => {
    const store = new EventStore<string>();
    
    // Start two consumers
    const consumer1Promise = store.consumeAll();
    const consumer2Promise = store.consumeAll();
    
    // Write events
    store.write("a");
    store.write("b");
    store.done();
    
    // Both consumers should get all events
    const [events1, events2] = await Promise.all([consumer1Promise, consumer2Promise]);
    expect(events1).toEqual(["a", "b"]);
    expect(events2).toEqual(["a", "b"]);
  });

  it("should throw when writing after done", () => {
    const store = new EventStore<string>();
    store.done();
    
    expect(() => store.write("event")).toThrow("Cannot write to a closed event store");
  });

  it("should provide utility methods", () => {
    const store = new EventStore<string>();
    
    expect(store.size()).toBe(0);
    expect(store.isComplete()).toBe(false);
    
    store.write("event1");
    store.write("event2");
    
    expect(store.size()).toBe(2);
    expect(store.isComplete()).toBe(false);
    
    store.done();
    
    expect(store.isComplete()).toBe(true);
  });

  it("should work with complex event types", async () => {
    interface TestEvent {
      type: string;
      payload: any;
      timestamp: number;
    }
    
    const store = new EventStore<TestEvent>();
    
    const event1: TestEvent = { type: "start", payload: {}, timestamp: Date.now() };
    const event2: TestEvent = { type: "data", payload: { value: 42 }, timestamp: Date.now() };
    const event3: TestEvent = { type: "end", payload: null, timestamp: Date.now() };
    
    store.write(event1);
    store.write(event2);
    store.write(event3);
    store.done();
    
    const events = await store.consumeAll();
    expect(events).toHaveLength(3);
    expect(events[0].type).toBe("start");
    expect(events[1].payload.value).toBe(42);
    expect(events[2].type).toBe("end");
  });
});