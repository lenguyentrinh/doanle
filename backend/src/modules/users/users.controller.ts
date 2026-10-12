import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPrincipal } from '../auth/strategies/jwt.strategy';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';

// Routes are UNPREFIXED (/users/...), mirroring the live /auth/* routes — the
// architecture's aspirational /api global prefix was never wired up.
@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private userService: UserService) {}

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: UserPrincipal,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(user.id, dto);
  }

  @Get('addresses')
  async getAddresses(@CurrentUser() user: UserPrincipal) {
    const data = await this.userService.getAddresses(user.id);
    return { data };
  }

  @Post('addresses')
  addAddress(
    @CurrentUser() user: UserPrincipal,
    @Body() dto: CreateAddressDto,
  ) {
    return this.userService.addAddress(user.id, dto);
  }

  @Patch('addresses/:id/default')
  async setDefaultAddress(
    @CurrentUser() user: UserPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.userService.setDefaultAddress(user.id, id);
    return { data };
  }

  @Patch('addresses/:id')
  editAddress(
    @CurrentUser() user: UserPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAddressDto,
  ) {
    return this.userService.editAddress(user.id, id, dto);
  }

  @Delete('addresses/:id')
  removeAddress(
    @CurrentUser() user: UserPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.userService.removeAddress(user.id, id);
  }
}
