import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../../common/storage/storage.module';
import { HomeHeroEntity } from './entities/home-hero.entity';
import { HomeHeroService } from './home-hero.service';
import { HomeHeroController } from './home-hero.controller';
import { HomeHeroAdminController } from './home-hero.admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([HomeHeroEntity]), StorageModule],
  controllers: [HomeHeroController, HomeHeroAdminController],
  providers: [HomeHeroService],
})
export class HomeHeroModule {}
