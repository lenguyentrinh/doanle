import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user-role.enum';
import { OrdersAdminService } from './orders-admin.service';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';

// AuthGuard('jwt') must run before RolesGuard so req.user is populated
// before the role check (Story 5.1 precedent). OrdersAdminService is now
// a dedicated service for admin-only order operations.
@ApiTags('admin-orders')
@Controller('admin/orders')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class OrdersAdminController {
  constructor(private readonly ordersAdminService: OrdersAdminService) {}

  @Get()
  findAll(@Query() query: AdminOrderQueryDto) {
    return this.ordersAdminService.findAllForAdmin(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return { data: await this.ordersAdminService.getOrderForAdmin(id) };
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersAdminService.updateOrderStatus(id, dto.status);
  }

  @Patch(':id/cancel')
  cancel(@Param('id', ParseObjectIdPipe) id: string) {
    return this.ordersAdminService.cancelOrder(id);
  }
}
