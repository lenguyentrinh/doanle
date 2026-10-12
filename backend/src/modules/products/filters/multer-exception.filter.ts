import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { MulterError } from 'multer';

// Multer throws its own error shape (a plain Error subclass, not a Nest
// HttpException) for interceptor-level failures Nest doesn't otherwise
// translate — file-size/file-count limits enforced inside multer itself
// (fileFilter-rejected files instead throw a real BadRequestException
// directly, see products.admin.controller.ts, and need no filter). Without
// this filter, Nest's default handling would leak a raw 500 for these.
@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const message =
      exception.code === 'LIMIT_FILE_SIZE'
        ? 'File too large'
        : exception.message;
    response.status(400).json({ statusCode: 400, message });
  }
}
