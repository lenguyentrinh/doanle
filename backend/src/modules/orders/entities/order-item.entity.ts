import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/utils/column-numeric.transformer';
import { Order } from './order.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('order_items')
@Index('idx_order_items_order_id', ['orderId'])
@Index('idx_order_items_product_id', ['productId'])
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_id' })
  orderId!: number;

  @Column({ name: 'product_id' })
  productId!: number;

  // Snapshotted at order time so historical orders survive product edits.
  @Column({ name: 'product_name' })
  productName!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  price!: number;

  @Column({ type: 'int' })
  quantity!: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;
}
