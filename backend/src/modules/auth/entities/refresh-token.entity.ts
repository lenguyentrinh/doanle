import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'token_hash' })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @Column({ name: 'is_revoked', default: false })
  isRevoked!: boolean;

  // Set alongside isRevoked whenever rotation revokes this row — lets
  // rotateRefreshToken tell "just rotated a moment ago by a legitimate
  // concurrent request" apart from "replayed well after the fact" when
  // deciding whether to treat a revoked-token replay as reuse.
  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt!: Date | null;

  // The row rotation produced when it revoked this one. Diagnostic only.
  @Column({ name: 'replaced_by_token_id', type: 'int', nullable: true })
  replacedByTokenId!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
