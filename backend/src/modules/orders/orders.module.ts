import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrdersService } from './orders.service';
import { OrdersAdminService } from './orders-admin.service';
import { OrdersController } from './orders.controller';
import { OrdersAdminController } from './orders.admin.controller';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { InventoryModule } from '../inventory/inventory.module';
import { StorageModule } from '../../common/storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    UsersModule,
    MailModule,
    InventoryModule,
    StorageModule,
  ],
  controllers: [OrdersController, OrdersAdminController],
  providers: [OrdersService, OrdersAdminService],
  exports: [OrdersService, OrdersAdminService],
})
export class OrdersModule {}
