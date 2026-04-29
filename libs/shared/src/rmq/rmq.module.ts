import { DynamicModule, Module } from '@nestjs/common';
import { RmqService } from './rmq.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

interface RmqModuleOptions {
  name: string; // SERVICES 토큰
  queue: string; // 실제 큐 이름 (버그 수정: 신규 파라미터)
}

@Module({
  providers: [RmqService],
  exports: [RmqService],
})
export class RmqModule {
  static register({ name, queue }: RmqModuleOptions): DynamicModule {
    return {
      module: RmqModule,
      imports: [
        ConfigModule,
        ClientsModule.registerAsync([
          {
            name,
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              transport: Transport.RMQ,
              options: {
                urls: [
                  config.get<string>('RABBITMQ_URI') ?? 'amqp://localhost:5672',
                ],
                queue,
                queueOptions: { durable: true },
              },
            }),
          },
        ]),
      ],
      exports: [ClientsModule, RmqService],
    };
  }
}
