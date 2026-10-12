import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CartService } from './cart.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPrincipal } from '../auth/strategies/jwt.strategy';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';

@ApiTags('cart')
// Using global `api/` prefix (excludes /auth and /users for backward compatibility).
// See main.ts app.setGlobalPrefix().
@Controller('cart')
@UseGuards(AuthGuard('jwt'))
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() user: UserPrincipal) {
    return this.cartService.getCart(user.id);
  }

  @Post()
  addItem(@CurrentUser() user: UserPrincipal, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user.id, dto);
  }

  @Post('merge')
  mergeCart(@CurrentUser() user: UserPrincipal, @Body() dto: MergeCartDto) {
    return this.cartService.mergeCart(user.id, dto);
  }

  @Patch(':itemId')
  updateItem(
    @CurrentUser() user: UserPrincipal,
    @Param('itemId', ParseObjectIdPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user.id, itemId, dto);
  }

  @Delete(':itemId')
  removeItem(
    @CurrentUser() user: UserPrincipal,
    @Param('itemId', ParseObjectIdPipe) itemId: string,
  ) {
    return this.cartService.removeItem(user.id, itemId);
  }
}
