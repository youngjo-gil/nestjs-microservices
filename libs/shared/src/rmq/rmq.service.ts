import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RmqContext, RmqOptions, Transport } from '@nestjs/microservices';

@Injectable()
export class RmqService {
  constructor(private readonly configService: ConfigService) {}

  getOptions(queue: string, noAck = false): RmqOptions {
    return {
      transport: Transport.RMQ,
      options: {
        urls: [
          this.configService.get<string>('RABBITMQ_URI') ??
            'amqp://localhost:5672',
        ],
        queue,
        noAck,
        persistent: true,
        queueOptions: { durable: true },
      },
    };
  }

  ack(context: RmqContext) {
    const channel = context.getChannelRef();
    channel.ack(context.getMessage());
  }
}
