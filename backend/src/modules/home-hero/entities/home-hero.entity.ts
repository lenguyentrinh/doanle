import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { applyJsonTransform } from '../../../common/database/schema-options';
import { HOME_HERO_TEMPLATES } from '../home-hero.constants';
import type { HomeHeroTemplate } from '../home-hero.constants';

export interface HomeHeroCta {
  label: string;
  href: string;
}

// Singleton document: its `_id` is always HOME_HERO_ROW_ID (a fixed string,
// not an ObjectId), upserted by HomeHeroService.
@Schema({
  collection: 'home_hero',
  timestamps: { createdAt: false, updatedAt: true },
})
export class HomeHeroEntity {
  @Prop({ type: String })
  _id!: string;

  @Prop({
    type: String,
    enum: HOME_HERO_TEMPLATES,
    required: true,
    maxlength: 20,
  })
  template!: HomeHeroTemplate;

  @Prop({ type: String, maxlength: 80, default: '' })
  eyebrow!: string;

  @Prop({ type: String, required: true, maxlength: 200 })
  title!: string;

  @Prop({ type: String, maxlength: 500, default: '' })
  subtitle!: string;

  @Prop({ type: { label: String, href: String }, _id: false, required: true })
  primaryCta!: HomeHeroCta;

  @Prop({ type: { label: String, href: String }, _id: false, required: true })
  secondaryCta!: HomeHeroCta;

  @Prop({ type: [String], default: [] })
  images!: string[];

  updatedAt!: Date;
}

export type HomeHeroDocument = HydratedDocument<HomeHeroEntity>;
export const HomeHeroSchema = applyJsonTransform(
  SchemaFactory.createForClass(HomeHeroEntity),
);
