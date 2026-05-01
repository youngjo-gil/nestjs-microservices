import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NotificationsServiceModule } from './notifications-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    NotificationsServiceModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URI || 'amqp://guest:guest@localhost:5672'],
        queue: 'notifications_queue',
        queueOptions: { durable: true },
        noAck: false,
      },
    },
  );
  await app.listen();
}
bootstrap();
