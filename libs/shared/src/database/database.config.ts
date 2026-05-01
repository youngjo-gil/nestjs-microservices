import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

export function createDatabaseConfig(dbNameEnv: string, entities: any[]) {
  return TypeOrmModule.forRootAsync({
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      type: 'postgres',
      host: configService.get('DB_HOST', 'localhost'),
      port: configService.get<number>('DB_PORT', 5432),
      username: configService.get('DB_USER', 'postgres'),
      password: configService.get('DB_PASSWORD', 'password'),
      database: configService.get(dbNameEnv),
      entities,
      synchronize: configService.get('NODE_ENV') !== 'production',
    }),
    inject: [ConfigService],
  });
}
