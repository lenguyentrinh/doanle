import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPrincipal } from '../auth/strategies/jwt.strategy';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';

@ApiTags('orders')
// Using global `api/` prefix (excludes /auth and /users for backward compatibility).
// See main.ts app.setGlobalPrefix().
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Controller('orders')
@UseGuards(AuthGuard('jwt'))
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createOrder(@CurrentUser() user: UserPrincipal, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(user.id, dto);
  }

  @Get()
  findAll(@Query() query: OrderQueryDto, @CurrentUser() user: UserPrincipal) {
    return this.ordersService.findAllForUser(user.id, query);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserPrincipal,
  ) {
    return {
      data: await this.ordersService.getOrderForUser(user.id, id),
    };
  }
}
