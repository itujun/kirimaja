import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { ZodEffects, ZodObject } from 'zod';

type ZodSchemaType = ZodObject<any> | ZodEffects<ZodObject<any>>;

interface ZodSchemaClass {
  schema: ZodSchemaType;
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    if (this.isZodSchema(metadata.metatype)) {
      const schema = metadata.metatype.schema;
      const result = schema.safeParse(value);

      if (!result.success) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: result.error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      return result.data;
    }

    return value;
  }

  private isZodSchema(metatype?: unknown): metatype is ZodSchemaClass {
    if (typeof metatype !== 'function') return false;

    const schema = (metatype as unknown as ZodSchemaClass).schema;
    return schema !== undefined && typeof schema.safeParse === 'function';
  }
}
