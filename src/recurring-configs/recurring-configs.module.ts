import { Module } from '@nestjs/common';
import { RecurringConfigsController } from './recurring-configs.controller';
import { RecurringConfigsService } from './recurring-configs.service';

@Module({
  controllers: [RecurringConfigsController],
  providers: [RecurringConfigsService]
})
export class RecurringConfigsModule {}
