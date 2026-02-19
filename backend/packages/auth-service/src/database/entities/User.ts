import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum UserType {
  SEEKER = 'seeker',
  OWNER = 'owner',
  AGENCY = 'agency',
  ADMIN = 'admin',
}

export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['user_type'])
@Index(['verification_status'])
@Index(['created_at'])
export class User {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  password_hash!: string;

  @Column({ type: 'varchar', length: 255 })
  full_name!: string;

  @Column({
    type: 'varchar',
    length: 20,
    enum: UserType,
    default: UserType.SEEKER,
  })
  user_type!: UserType;

  @Column({ type: 'text', nullable: true })
  avatar_url?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({
    type: 'varchar',
    length: 20,
    enum: VerificationStatus,
    default: VerificationStatus.UNVERIFIED,
  })
  verification_status!: VerificationStatus;

  @Column({ type: 'text', nullable: true })
  verification_document_url?: string;

  @Column({ type: 'datetime', nullable: true })
  verification_date?: Date;

  @Column({ type: 'simple-json', nullable: true })
  notification_preferences?: Record<string, boolean>;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: 'datetime', nullable: true })
  deleted_at?: Date;

  // Helper methods
  isActive(): boolean {
    return !this.deleted_at;
  }

  isVerified(): boolean {
    return this.verification_status === VerificationStatus.APPROVED;
  }
}
