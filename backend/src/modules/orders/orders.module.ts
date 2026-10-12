import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './entities/order.entity';
import { Product, ProductSchema } from '../products/entities/product.entity';
import { CartItem, CartItemSchema } from '../cart/entities/cart-item.entity';
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
    // Order items are embedded in Order, so there is no OrderItem model.
    // Product/CartItem are registered for the stock reservation and
    // cart-clearing steps of order placement.
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: CartItem.name, schema: CartItemSchema },
    ]),
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
