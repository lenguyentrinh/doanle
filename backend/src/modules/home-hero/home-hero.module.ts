import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StorageModule } from '../../common/storage/storage.module';
import { HomeHeroEntity, HomeHeroSchema } from './entities/home-hero.entity';
import { HomeHeroService } from './home-hero.service';
import { HomeHeroController } from './home-hero.controller';
import { HomeHeroAdminController } from './home-hero.admin.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HomeHeroEntity.name, schema: HomeHeroSchema },
    ]),
    StorageModule,
  ],
  controllers: [HomeHeroController, HomeHeroAdminController],
  providers: [HomeHeroService],
})
export class HomeHeroModule {}
