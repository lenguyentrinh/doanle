import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { StorageModule } from '../../common/storage/storage.module';

@Module({
  // Product is registered here too so CartService can read product stock /
  // image keys for the cart view (the repository can be shared across modules).
  imports: [TypeOrmModule.forFeature([CartItem, Product]), StorageModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
