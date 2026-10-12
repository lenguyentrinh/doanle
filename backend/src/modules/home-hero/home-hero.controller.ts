import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { HomeHeroService } from './home-hero.service';

@ApiTags('home-hero')
@Controller('home-hero')
export class HomeHeroController {
  constructor(private readonly homeHeroService: HomeHeroService) {}

  // Public. Returns the literal JSON `null` when never configured — Nest
  // would otherwise send an empty body for a null return value, which breaks
  // the frontend's response.json().
  @Get()
  async get(@Res() res: Response) {
    res.json(await this.homeHeroService.get());
  }
}
