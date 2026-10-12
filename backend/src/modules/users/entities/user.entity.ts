import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRole } from './user-role.enum';
import { Address } from './address.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userName!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ nullable: true, type: 'date' })
  birthDate!: string | null;

  @Column({ type: 'varchar', nullable: true })
  phoneNumber!: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CUSTOMER })
  role!: UserRole;

  @Column({ default: false })
  emailVerified!: boolean;

  @Column({ nullable: true })
  emailOtpCode!: string;

  @Column({ type: 'timestamp', nullable: true })
  emailOtpExpires!: Date | null;

  @Column({ name: 'email_otp_attempts', default: 0 })
  emailOtpAttempts!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @OneToMany(() => Address, (address) => address.user)
  addresses!: Address[];
}
