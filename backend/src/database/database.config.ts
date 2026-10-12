import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const DEFAULT_MONGODB_URI = 'mongodb://localhost:27017/ecommerce';

// Multi-document transactions (orders, cart, refresh-token rotation) require
// a replica set — a standalone mongod will fail those operations. docker-compose
// starts Mongo as a single-node replica set; use ?replicaSet=rs0 in the URI.
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI') || DEFAULT_MONGODB_URI,
      }),
    }),
  ],
})
export class DatabaseModule {}
