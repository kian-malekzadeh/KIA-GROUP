import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from '@kia-group/shared';
import { CurrentUser } from '@kia-group/platform';
import { JwtAuthGuard } from '@kia-group/platform';
import { ProfileCompleteGuard } from '@kia-group/platform';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';

@Controller('assessments')
@UseGuards(JwtAuthGuard, ProfileCompleteGuard)
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAssessmentDto) {
    return this.assessmentsService.create(dto, user.id);
  }

  @Get('latest')
  latest(@CurrentUser() user: AuthUser) {
    return this.assessmentsService.latestForUser(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.assessmentsService.findOne(id, user.id);
  }
}
