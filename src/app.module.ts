import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { RmqModule } from './config/rmq/rmq.module';

@Module({
  imports: [UsersModule, ProductsModule, RmqModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
