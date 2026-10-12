import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from './entities/category.entity';
import { Product, ProductSchema } from '../products/entities/product.entity';
import { CategoriesService } from './categories.service';
import { CategoriesAdminController } from './categories.admin.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      // Registered here too so CategoriesService can count products (the
      // same schema registered in ProductsModule; models are per-connection).
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [CategoriesAdminController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
