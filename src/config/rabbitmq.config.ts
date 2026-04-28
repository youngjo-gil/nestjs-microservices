import { ClientOptions, Transport } from '@nestjs/microservices';

export const rabbitmqConfig: ClientOptions = {
  transport: Transport.RMQ,
  options: {
    urls: ['amqp://localhost:5672'],
    queue: 'main_queue',
    queueOptions: {
      durable: true,
    },
  },
};
