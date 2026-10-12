import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';
import type { HomeHeroTemplate } from '../home-hero.constants';

export interface HomeHeroCta {
  label: string;
  href: string;
}

@Entity('home_hero')
export class HomeHeroEntity {
  @PrimaryColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'varchar', length: 20 })
  template!: HomeHeroTemplate;

  @Column({ type: 'varchar', length: 80 })
  eyebrow!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'varchar', length: 500 })
  subtitle!: string;

  @Column({ type: 'json' })
  primaryCta!: HomeHeroCta;

  @Column({ type: 'json' })
  secondaryCta!: HomeHeroCta;

  @Column({ type: 'json' })
  images!: string[];

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
