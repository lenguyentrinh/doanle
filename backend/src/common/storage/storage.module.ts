import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';

// Exported so Cart/Orders can inject StorageService without importing all of
// ProductsModule (which would pull in Product's TypeORM repository, its
// controllers, etc. just to resolve an image URL).
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
