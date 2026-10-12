import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MailService } from '../mail/mail.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user-role.enum';

@Controller('health')
export class HealthController {
  constructor(private mailService: MailService) {}

  @Get()
  checkHealth() {
    return { status: 'ok' };
  }

  @Get('mail')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async checkMail() {
    return this.mailService.checkSmtpHealth();
  }
}
