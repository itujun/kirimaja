import { z, ZodObject } from 'zod';

export const createUserAddressesSchema = z.object({
    address: z
        .string({
            required_error: 'Address is required',
            invalid_type_error: 'Address must be a string',
        })
        .min(1, 'Address must be at least 1 characters'),
    tag: z
        .string({
            required_error: 'Tag is required',
            invalid_type_error: 'Tag must be a string',
        })
        .min(1, 'Tag must be at least 1 characters'),
    label: z
        .string({
            required_error: 'Label is required',
            invalid_type_error: 'Label must be a string',
        })
        .min(1, 'Label must be at least 1 characters'),
    photo: z.string().optional().nullable(),
});

export class CreateUserAddressesDto {
    static schema: ZodObject<any> = createUserAddressesSchema;

    constructor(
        public address: string,
        public tag: string,
        public label: string,
        public photo: string | null,
    ) {}
}
