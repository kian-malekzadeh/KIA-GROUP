import { Module } from '@nestjs/common';
import { AdminAccessGuard } from '@kia-group/platform';
import { RolesGuard } from '@kia-group/platform';
import { MediaModule } from '@kia-group/platform';
import { PaymentsModule } from '../commerce/payments/payments.module';
import { SiteSettingsModule } from '@kia-group/platform';
import { AuthModule } from '../auth/auth.module';
import { AdminAuditService } from './audit.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [MediaModule, SiteSettingsModule, PaymentsModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService, AdminAuditService, RolesGuard, AdminAccessGuard],
})
export class AdminModule {}
