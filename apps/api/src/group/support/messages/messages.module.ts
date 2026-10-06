import { Module } from '@nestjs/common';
import { AdminAccessGuard } from '@kia-group/platform';
import { RolesGuard } from '@kia-group/platform';
import { SiteSettingsModule } from '@kia-group/platform';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [SiteSettingsModule],
  controllers: [MessagesController],
  providers: [MessagesService, RolesGuard, AdminAccessGuard],
})
export class MessagesModule {}
