import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import jwtConfig from './config/jwt.config';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { HomeHeroModule } from './modules/home-hero/home-hero.module';
import { DatabaseModule } from './database/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [jwtConfig],
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    AdminModule,
    HealthModule,
    HomeHeroModule,
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60000, limit: 60 }],
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
