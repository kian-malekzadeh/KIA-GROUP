import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { envValidationSchema } from './config/env.validation';
import { RateLimitModule } from '@kia-group/platform';
import { DomainEventsModule } from '@kia-group/platform';
import { AppController } from './app.controller';
import { PrismaModule } from '@kia-group/platform';

/*
 * KIA GROUP domain registry.
 *
 * The API is a modular monolith: every Nest module belongs to exactly one
 * department domain, and the folder layout mirrors that ownership:
 *
 *   src/ + @kia-group/platform — the platform shell (identity, sessions,
 *                   admin, settings via packages/platform, SMS, support,
 *                   billing/commerce, health) — packages/platform also holds
 *                   the Prisma kernel + shared guards/decorators/events
 *   @kia-group/kia-academy — KIA Academy learning domain  (kia-group/kia-academy)
 *   @kia-group/kia-event   — competitions, challenges & bootcamps
 *                            (kia-group/kia-event)
 *
 * Departments never import each other's services: cross-department reads go
 * through the shared package contracts or the domain-events bus.
 */
import { AuthModule } from './group/auth/auth.module';
import { AdminModule } from './group/admin/admin.module';
import { SiteSettingsModule } from '@kia-group/platform';
import { MediaModule } from '@kia-group/platform';
import { EmailModule } from '@kia-group/platform';
import { SmsModule } from './group/sms/sms.module';
import { ContactModule } from './group/contact/contact.module';
import { HealthModule } from './group/health/health.module';
import { TicketsModule } from './group/support/tickets/tickets.module';
import { MessagesModule } from './group/support/messages/messages.module';
import { TodosModule } from './group/support/todos/todos.module';
import { CartModule } from './group/commerce/cart/cart.module';
import { PaymentsModule } from './group/commerce/payments/payments.module';
import { StripeModule } from './group/commerce/stripe/stripe.module';
import { SearchModule } from './group/search/search.module';
import { CoursesModule } from '@kia-group/kia-academy';
import { CourseExamsModule } from '@kia-group/kia-academy';
import { AssessmentsModule } from '@kia-group/kia-academy';
import { PersonalityModule } from '@kia-group/kia-academy';
import { RoadmapsModule } from '@kia-group/kia-academy';
import { ReadinessModule } from '@kia-group/kia-academy';
import { BootcampModule } from '@kia-group/kia-event';
import { TestBanksModule } from '@kia-group/kia-academy';
import { ProgressModule } from '@kia-group/kia-academy';
import { CompetitionsModule } from '@kia-group/kia-event';
import { ChallengesModule } from '@kia-group/kia-event';

@Module({
  controllers: [AppController],
  imports: [
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: [
    '../../.env',
    '.env',
  ],
  validationSchema: envValidationSchema,
}),    // CI-2: throttling storage is selected by RateLimitModule (imported below,
    // global) — the Redis-backed provider when REDIS_URL is configured, the
    // stock in-memory service otherwise. It re-registers ThrottlerStorage at a
    // later position in the DI graph, which wins over ThrottlerModule's default.
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    RateLimitModule,
    PrismaModule,
    // Platform-wide domain event bus (see src/common/events).
    DomainEventsModule,
    // ── KIA GROUP platform (identity, settings, support, billing) ──────────
    AuthModule,
    AdminModule,
    SiteSettingsModule,
    MediaModule,
    EmailModule,
    SmsModule,
    ContactModule,
    HealthModule,
    TicketsModule,
    MessagesModule,
    TodosModule,
    CartModule,
    PaymentsModule,
    StripeModule,
    SearchModule,
    // ── KIA Academy (learning domain) ──────────────────────────────────────
    CoursesModule,
    CourseExamsModule,
    AssessmentsModule,
    PersonalityModule,
    RoadmapsModule,
    ReadinessModule,
    BootcampModule,
    TestBanksModule,
    ProgressModule,
    // ── KIA Event (competitions & challenges) ────────────────────────────
    CompetitionsModule,
    ChallengesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
