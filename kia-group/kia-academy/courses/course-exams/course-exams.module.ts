import { Module } from '@nestjs/common';
import { AdminAccessGuard } from '@kia-group/platform';
import { RolesGuard } from '@kia-group/platform';
import { SiteSettingsModule } from '@kia-group/platform';
import { AdminCourseExamsController } from './admin-course-exams.controller';
import { CourseExamsController } from './course-exams.controller';
import { CourseExamsService } from './course-exams.service';

@Module({
  imports: [SiteSettingsModule],
  controllers: [CourseExamsController, AdminCourseExamsController],
  providers: [CourseExamsService, RolesGuard, AdminAccessGuard],
  exports: [CourseExamsService],
})
export class CourseExamsModule {}

