import { Module } from '@nestjs/common';
import { AiJobsController } from './ai-jobs.controller';
import { AiJobsService } from './ai-jobs.service';

@Module({
  controllers: [AiJobsController],
  providers: [AiJobsService]
})
export class AiJobsModule {}
