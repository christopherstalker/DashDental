import { Module } from '@nestjs/common';
import { ProjectionsModule } from '@app/modules/projections/projections.module';
import { InboxController } from './inbox.controller';
import { InboxService } from './inbox.service';

@Module({
  imports: [ProjectionsModule],
  controllers: [InboxController],
  providers: [InboxService],
  exports: [InboxService],
})
export class InboxModule {}
