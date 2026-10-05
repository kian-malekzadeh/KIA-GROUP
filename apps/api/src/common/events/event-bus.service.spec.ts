import { EventBusService } from './event-bus.service';
import type { CourseCompletedEvent, PaymentCompletedEvent } from './domain-events';

describe('EventBusService', () => {
  const payment: PaymentCompletedEvent = {
    name: 'group.payment.completed',
    occurredAt: '2026-01-01T00:00:00.000Z',
    userId: 'u1',
    paymentId: 'p1',
    orderId: 'o1',
    amountCents: 1200000,
    grantedEntitlements: ['course:nextjs'],
  };

  it('delivers an event to every subscriber of its name', async () => {
    const bus = new EventBusService();
    const seen: PaymentCompletedEvent[] = [];
    bus.on<PaymentCompletedEvent>('group.payment.completed', (e) => {
      seen.push(e);
    });

    await bus.publish(payment);

    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual(payment);
  });

  it('does not deliver to subscribers of other names', async () => {
    const bus = new EventBusService();
    const seen: CourseCompletedEvent[] = [];
    bus.on<CourseCompletedEvent>('academy.course.completed', (e) => {
      seen.push(e);
    });

    await bus.publish(payment);

    expect(seen).toHaveLength(0);
  });

  it('isolates consumer failures from other consumers and the publisher', async () => {
    const bus = new EventBusService();
    const good = jest.fn();
    const bad = jest.fn().mockRejectedValue(new Error('boom'));
    bus.on('group.payment.completed', bad);
    bus.on('group.payment.completed', good);

    await expect(bus.publish(payment)).resolves.toBeUndefined();
    expect(bad).toHaveBeenCalled();
    expect(good).toHaveBeenCalled();
  });

  it('never throws when no subscriber exists', async () => {
    const bus = new EventBusService();
    await expect(bus.publish(payment)).resolves.toBeUndefined();
  });

  it('stops delivering after unsubscribe', async () => {
    const bus = new EventBusService();
    const seen: PaymentCompletedEvent[] = [];
    const off = bus.on<PaymentCompletedEvent>('group.payment.completed', (e) => {
      seen.push(e);
    });

    off();
    await bus.publish(payment);

    expect(seen).toHaveLength(0);
    // The set for the name stays registered after its last handler is
    // removed — only the handlers are gone.
    expect(bus.subscribedNames()).toEqual(['group.payment.completed']);
  });
});
