import { ZodObject } from 'zod';
import { createUserAddressesSchema } from './create-user-address.dto';

const updateUserAddressesSchema = createUserAddressesSchema.partial(); // <- zod native equivalent dari "PartialType"

export class UpdateUserAddressDto {
    static schema: ZodObject<any> = updateUserAddressesSchema;

    constructor(
        public readonly address?: string,
        public readonly tag?: string,
        public readonly label?: string,
        public readonly photo?: string | null,
    ) {}
}
