import { Global, Module } from '@nestjs/common';

import { EventBusService } from './event-bus.service';

/**
 * Global module so every department can inject `EventBusService` to publish
 * events. Consumers subscribe in their own modules (or in the future
 * notification module) — no department imports another department's code.
 */
@Global()
@Module({
  providers: [EventBusService],
  exports: [EventBusService],
})
export class DomainEventsModule {}
