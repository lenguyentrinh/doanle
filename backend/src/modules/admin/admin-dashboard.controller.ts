import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user-role.enum';
import {
  AdminDashboardService,
  AdminDashboardStats,
} from './admin-dashboard.service';

// AuthGuard('jwt') must run before RolesGuard so req.user is populated before
// the role check — stacking both locally (in this order) guarantees that,
// unlike the removed global RolesGuard registration (see app.module.ts).
@Controller('admin/dashboard')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('stats')
  async getStats(): Promise<{ data: AdminDashboardStats }> {
    return { data: await this.adminDashboardService.getStats() };
  }
}
