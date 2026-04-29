import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { ConfigModule } from '@nestjs/config';
import { RmqModule } from '@app/shared/rmq/rmq.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RmqModule.register({
      name: 'API_SERVICE',
      queue: process.env.API_QUEUE ?? 'api_queue',
    }),
  ],
  controllers: [ApiController],
  providers: [ApiService],
})
export class ApiModule {}
