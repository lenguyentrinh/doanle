import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/utils/column-numeric.transformer';
import { Category } from '../../categories/entities/category.entity';

@Entity('products')
@Index('idx_products_category_id', ['categoryId'])
@Index('idx_products_isActive', ['isActive'])
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  price!: number;

  @Column({ type: 'int', default: 0 })
  stockQuantity!: number;

  // Per-product discount, admin-editable one-at-a-time or in bulk. `null`
  // means "no discount configured" — distinct from `0`, which is a valid
  // (if pointless) 0% discount. See UpdateProductDto for the clear-vs-omit
  // convention used when this travels over multipart form fields.
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: new ColumnNumericTransformer(),
  })
  discountPercentage!: number | null;

  @Column({ name: 'category_id' })
  categoryId!: number;

  @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category!: Category;

  /**
   * Storage object keys only (e.g. "product-placeholder.svg") — NEVER full URLs.
   * Public URLs are generated at read time in ProductsService.
   */
  @Column({ type: 'json' })
  imageKeys!: string[];

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;
}
