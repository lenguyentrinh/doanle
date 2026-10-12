import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthLookbookService } from './auth-lookbook.service';

@ApiTags('auth-lookbook')
@Controller('auth-lookbook')
export class AuthLookbookController {
  constructor(private readonly authLookbookService: AuthLookbookService) {}

  // Public. Always an object; `imageUrl: null` means no image is set.
  @Get()
  get() {
    return this.authLookbookService.get();
  }
}
