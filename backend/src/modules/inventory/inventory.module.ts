import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LowStockAlert } from './entities/low-stock-alert.entity';
import { InventoryService } from './inventory.service';

@Module({
  imports: [TypeOrmModule.forFeature([LowStockAlert])],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
