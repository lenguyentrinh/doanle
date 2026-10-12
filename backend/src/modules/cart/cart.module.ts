import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CartItem, CartItemSchema } from './entities/cart-item.entity';
import { Product, ProductSchema } from '../products/entities/product.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { StorageModule } from '../../common/storage/storage.module';

@Module({
  // Product is registered here too so CartService can read product stock /
  // image keys for the cart view (models are per-connection, so the same
  // schema can be registered from several modules).
  imports: [
    MongooseModule.forFeature([
      { name: CartItem.name, schema: CartItemSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    StorageModule,
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
