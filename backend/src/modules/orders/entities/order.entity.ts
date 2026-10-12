import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/utils/column-numeric.transformer';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

// JSON snapshot of the user's owned saved address (Story 1.5 shape).
export interface ShippingAddressSnapshot {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
}

@Entity('orders')
@Index('idx_orders_user_id', ['userId'])
@Index('idx_orders_status_created_at', ['status', 'createdAt'])
@Index('idx_orders_confirmed_at', ['confirmedAt'])
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status!: OrderStatus;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  subtotal!: number;

  @Column({
    name: 'shipping_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 30000,
    transformer: new ColumnNumericTransformer(),
  })
  shippingFee!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  tax!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  total!: number;

  @Column({ name: 'shipping_address', type: 'json' })
  shippingAddress!: ShippingAddressSnapshot;

  // Payment reference from an external gateway. Unused under the current
  // Cash-on-Delivery model (payment is collected by the courier on delivery),
  // so it stays null; retained as the seam a future online gateway would fill.
  @Column({
    name: 'payment_reference',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  paymentReference!: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 255 })
  idempotencyKey!: string;

  // Per-status-transition timestamps for the order-detail status timeline
  // (Story 4.4). All start null on a freshly placed (pending) order and are
  // stamped as an admin advances the order forward
  // (confirmed→shipped→delivered) via updateOrderStatus.
  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt!: Date | null;

  @Column({ name: 'shipped_at', type: 'timestamp', nullable: true })
  shippedAt!: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt!: Date | null;

  // cascade so persisting an Order also inserts its OrderItems in the same
  // save (createOrder builds `items` in-memory and saves the parent). Without
  // this, the order saves but order_items stays empty.
  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items!: OrderItem[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
