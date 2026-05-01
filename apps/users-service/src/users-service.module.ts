import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createDatabaseConfig } from '@app/shared';
import { UsersServiceController } from './users-service.controller';
import { UsersServiceService } from './users-service.service';
import { UserProfile } from './profiles/user-profile.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    createDatabaseConfig('USERS_DB_NAME', [UserProfile]),
    TypeOrmModule.forFeature([UserProfile]),
  ],
  controllers: [UsersServiceController],
  providers: [UsersServiceService],
})
export class UsersServiceModule {}
