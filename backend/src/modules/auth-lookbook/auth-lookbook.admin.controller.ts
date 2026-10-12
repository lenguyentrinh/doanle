import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user-role.enum';
import { MulterExceptionFilter } from '../products/filters/multer-exception.filter';
import {
  IMAGES_INTERCEPTOR_OPTIONS,
  assertValidImageMagicBytes,
} from '../products/products.admin.controller';
import { AuthLookbookService } from './auth-lookbook.service';
import { UpdateAuthLookbookDto } from './dto/update-auth-lookbook.dto';

// AuthGuard('jwt') must run before RolesGuard — same precedent as the other
// admin controllers.
@ApiTags('admin-auth-lookbook')
@Controller('admin/auth-lookbook')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
@UseFilters(MulterExceptionFilter)
export class AuthLookbookAdminController {
  constructor(private readonly authLookbookService: AuthLookbookService) {}

  @Get()
  get() {
    return this.authLookbookService.get();
  }

  @Put()
  update(@Body() dto: UpdateAuthLookbookDto) {
    return this.authLookbookService.upsert(dto);
  }

  @Post('images')
  @UseInterceptors(FileInterceptor('file', IMAGES_INTERCEPTOR_OPTIONS))
  async uploadImage(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('Cần một file hình ảnh');
    }
    assertValidImageMagicBytes(file);
    return this.authLookbookService.uploadImage(file);
  }
}
