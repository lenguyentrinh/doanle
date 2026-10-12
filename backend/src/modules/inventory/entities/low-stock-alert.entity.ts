import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

// Maps to the low_stock_alerts table created by the CreateLowStockAlerts
// migration. No FK to orders/products — this is a standalone alert log, not
// a joined view of order/product state.
@Entity('low_stock_alerts')
@Index('idx_low_stock_alerts_product_id', ['productId'])
export class LowStockAlert {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_id' })
  orderId!: number;

  @Column({ name: 'product_id' })
  productId!: number;

  @Column({ name: 'product_name' })
  productName!: string;

  @Column({ name: 'remaining_stock' })
  remainingStock!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
