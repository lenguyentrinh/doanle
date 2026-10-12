import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user-role.enum';
import { CategoriesService } from './categories.service';
import { AdminCategoryQueryDto } from './dto/admin-category-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';

// AuthGuard('jwt') must run before RolesGuard so req.user is populated
// before the role check — same precedent as ProductsAdminController.
@ApiTags('admin-categories')
@Controller('admin/categories')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class CategoriesAdminController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@Query() query: AdminCategoryQueryDto) {
    return this.categoriesService.findAllForAdmin(query);
  }

  @Post()
  async create(@Body() dto: CreateCategoryDto) {
    const data = await this.categoriesService.create(dto);
    return { data, message: 'Đã tạo danh mục' };
  }

  @Patch(':id')
  async rename(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const data = await this.categoriesService.rename(id, dto);
    return { data, message: 'Đã cập nhật danh mục' };
  }

  @Delete(':id')
  async remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.categoriesService.remove(id);
  }
}
