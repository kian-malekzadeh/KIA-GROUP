import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { envValidationSchema } from './config/env.validation';
import { RateLimitModule } from './common/rate-limit/rate-limit.module';
import { DomainEventsModule } from './common/events/domain-events.module';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';

/*
 * KIA GROUP domain registry.
 *
 * The API is a modular monolith: every Nest module belongs to exactly one
 * department domain, and the folder layout mirrors that ownership:
 *
 *   src/group/    — the platform layer (identity, sessions, admin, settings,
 *                   media, email, SMS, support, billing/commerce, health)
 *   src/academy/  — the KIA Academy learning domain
 *   src/events/   — the KIA Events competitions & challenges domain
 *   src/common/   — cross-domain platform infrastructure (guards, rate
 *                   limiting, domain events, search)
 *
 * Departments never import each other's services: cross-department reads go
 * through the shared package contracts or the domain-events bus.
 */
import { AuthModule } from './group/auth/auth.module';
import { AdminModule } from './group/admin/admin.module';
import { SiteSettingsModule } from './group/site-settings/site-settings.module';
import { MediaModule } from './group/media/media.module';
import { EmailModule } from './group/email/email.module';
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
import { CoursesModule } from './academy/courses/courses.module';
import { CourseExamsModule } from './academy/course-exams/course-exams.module';
import { AssessmentsModule } from './academy/assessments/assessments.module';
import { PersonalityModule } from './academy/personality/personality.module';
import { RoadmapsModule } from './academy/roadmaps/roadmaps.module';
import { ReadinessModule } from './academy/readiness/readiness.module';
import { BootcampModule } from './academy/bootcamp/bootcamp.module';
import { TestBanksModule } from './academy/test-banks/test-banks.module';
import { ProgressModule } from './academy/progress/progress.module';
import { CompetitionsModule } from './events/competitions/competitions.module';
import { ChallengesModule } from './events/challenges/challenges.module';

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
    // ── KIA Events (competitions & challenges) ────────────────────────────
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
