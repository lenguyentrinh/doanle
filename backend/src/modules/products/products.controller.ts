import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ProductQueryDto } from './dto/product-query.dto';

@ApiTags('products')
// Using global `api/` prefix (excludes /auth and /users for backward compatibility).
// See main.ts app.setGlobalPrefix().
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  // MUST be declared before ':id' so "categories" is not captured as an id.
  @Get('categories')
  async getCategories() {
    return { data: await this.productsService.getCategories() };
  }

  // MUST be declared before ':id' so "stats" is not captured as an id.
  @Get('stats')
  async getStats() {
    return { data: await this.productsService.getStorefrontStats() };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.productsService.findOne(id) };
  }
}
