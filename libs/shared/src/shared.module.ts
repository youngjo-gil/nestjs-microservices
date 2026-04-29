import { Module } from '@nestjs/common';
import { SharedService } from './shared.service';
import { RmqModule } from './rmq/rmq.module';
import { RmqService } from './rmq/rmq.service';

@Module({
  providers: [SharedService, RmqService],
  exports: [SharedService],
  imports: [RmqModule],
})
export class SharedModule {}
