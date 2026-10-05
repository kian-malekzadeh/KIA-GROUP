import { Injectable, Logger } from '@nestjs/common';

import type { DomainEvent, DomainEventName, DomainEventHandler } from './domain-events';

/**
 * Typed in-process domain event bus.
 *
 * See `domain-events.ts` for the contract. The bus guarantees:
 *  - a publishing flow never fails because of a consumer (errors are logged);
 *  - every event is written to the structured log (`audit`-style observability);
 *  - handlers registered for a name receive events published for that name.
 *
 * It is deliberately synchronous/in-process: the current deployment is a
 * single instance, and a transactional outbox would only pay off with
 * multi-writer fan-out (see docs/AUDIT.md PAY-5 for the same trade-off).
 * When the platform grows a notification center or a second instance, this
 * service is the seam: swap `publish` for an outbox write and keep the
 * handler signatures unchanged.
 */
@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  private readonly handlers = new Map<DomainEventName, Set<DomainEventHandler>>();

  /** Subscribe to a specific event name. Returns an unsubscribe function. */
  on<T extends DomainEvent>(name: T['name'], handler: DomainEventHandler<T>): () => void {
    let set = this.handlers.get(name);
    if (!set) {
      set = new Set();
      this.handlers.set(name, set);
    }
    const typed = handler as DomainEventHandler;
    set.add(typed);
    return () => set?.delete(typed);
  }

  /**
   * Publish an event to all subscribers. Never throws: consumer failures are
   * logged and isolated, so business transactions cannot be broken by events.
   */
  async publish<T extends DomainEvent>(event: T): Promise<void> {
    this.logger.log(JSON.stringify({ event: event.name, ...event }));
    const set = this.handlers.get(event.name);
    if (!set || set.size === 0) return;
    await Promise.all(
      [...set].map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          this.logger.error(
            `domain event consumer failed: ${event.name}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }),
    );
  }

  /** Test/inspection helper — the names that currently have subscribers. */
  subscribedNames(): DomainEventName[] {
    return [...this.handlers.keys()];
  }
}
