import { Module } from '@nestjs/common';
import { ProjectionsService } from './projections.service';

@Module({
  providers: [ProjectionsService],
  exports: [ProjectionsService],
})
export class ProjectionsModule {}
