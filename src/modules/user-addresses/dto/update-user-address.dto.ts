import { ZodObject } from 'zod';
import { createUserAddressesSchema } from './create-user-address.dto';

const updateUserAddressesSchema = createUserAddressesSchema.partial(); // <- zod native equivalent dari "PartialType"

export class UpdateUserAddressDto {
    static schema: ZodObject<any> = updateUserAddressesSchema;

    constructor(
        public address?: string,
        public tag?: string,
        public label?: string,
    ) {}
}
