import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export function isObjectIdString(value: unknown): value is string {
  return typeof value === 'string' && OBJECT_ID_REGEX.test(value);
}

/** Route-param counterpart of ParseIntPipe for ObjectId strings (400 on bad id). */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isObjectIdString(value)) {
      throw new BadRequestException(
        'Validation failed (ObjectId string is expected)',
      );
    }
    return value;
  }
}
