import { ValueTransformer } from 'typeorm';

/**
 * The mysql2 driver returns DECIMAL columns as strings. This transformer
 * keeps the value as a number in the entity / JSON responses so callers can
 * do price math without parsing first.
 */
export class ColumnNumericTransformer implements ValueTransformer {
  to(value: number | null): number | null {
    return value;
  }

  from(value: string | null): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    return parseFloat(value);
  }
}
