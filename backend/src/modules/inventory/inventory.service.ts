import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { LowStockAlert } from './entities/low-stock-alert.entity';
import type { OrderCreatedPayload } from '../orders/order-events.types';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
  private readonly lowStockThreshold: number;

  constructor(
    @InjectModel(LowStockAlert.name)
    private readonly lowStockAlertModel: Model<LowStockAlert>,
    configService: ConfigService,
  ) {
    this.lowStockThreshold =
      Number(configService.get<string>('LOW_STOCK_THRESHOLD')) || 5;
  }

  async handleOrderCreated(payload: OrderCreatedPayload): Promise<void> {
    const lowStockItems = payload.items.filter(
      (item) => item.remainingStock < this.lowStockThreshold,
    );

    if (lowStockItems.length === 0) {
      this.logger.log(`order ${payload.orderId}: no items below threshold`);
      return;
    }

    await this.lowStockAlertModel.insertMany(
      lowStockItems.map((item) => ({
        orderId: payload.orderId,
        productId: item.productId,
        productName: item.productName,
        remainingStock: item.remainingStock,
      })),
    );
    this.logger.log(
      `order ${payload.orderId}: low-stock alert saved for ${lowStockItems
        .map((item) => `${item.productName} (${item.remainingStock} left)`)
        .join(', ')}`,
    );
  }
}
