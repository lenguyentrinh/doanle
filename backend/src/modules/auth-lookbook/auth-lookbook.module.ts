import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StorageModule } from '../../common/storage/storage.module';
import {
  AuthLookbookEntity,
  AuthLookbookSchema,
} from './entities/auth-lookbook.entity';
import { AuthLookbookService } from './auth-lookbook.service';
import { AuthLookbookController } from './auth-lookbook.controller';
import { AuthLookbookAdminController } from './auth-lookbook.admin.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuthLookbookEntity.name, schema: AuthLookbookSchema },
    ]),
    StorageModule,
  ],
  controllers: [AuthLookbookController, AuthLookbookAdminController],
  providers: [AuthLookbookService],
})
export class AuthLookbookModule {}
