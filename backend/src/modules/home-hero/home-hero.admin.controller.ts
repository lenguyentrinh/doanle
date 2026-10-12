import {
  BadRequestException,
  Body,
  Controller,
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
import { HomeHeroService } from './home-hero.service';
import { UpdateHomeHeroDto } from './dto/update-home-hero.dto';

// AuthGuard('jwt') must run before RolesGuard — same precedent as the other
// admin controllers.
@ApiTags('admin-home-hero')
@Controller('admin/home-hero')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
@UseFilters(MulterExceptionFilter)
export class HomeHeroAdminController {
  constructor(private readonly homeHeroService: HomeHeroService) {}

  @Put()
  update(@Body() dto: UpdateHomeHeroDto) {
    return this.homeHeroService.upsert(dto);
  }

  @Post('images')
  @UseInterceptors(FileInterceptor('file', IMAGES_INTERCEPTOR_OPTIONS))
  async uploadImage(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('Cần một file hình ảnh');
    }
    assertValidImageMagicBytes(file);
    return this.homeHeroService.uploadImage(file);
  }
}
