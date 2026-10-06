import { Controller, Get, UseGuards } from '@nestjs/common';
import type { AuthUser, LearnerProgressSummary } from '@kia-group/shared';
import { CurrentUser } from '@kia-group/platform';
import { JwtAuthGuard } from '@kia-group/platform';
import { ProgressService } from './progress.service';

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get()
  getSummary(@CurrentUser() user: AuthUser): Promise<LearnerProgressSummary> {
    return this.progressService.getSummary(user.id);
  }
}
