import { z } from 'zod';

const updateProfileSchema = z.object({
    name: z
        .string({
            required_error: 'Name is required',
            invalid_type_error: 'Name must be a string',
        })
        .optional(),
    email: z
        .string({
            required_error: 'Email is required',
            invalid_type_error: 'Email must be a string',
        })
        .email({
            message: 'Email is invalid',
        })
        .optional(),
    password: z
        .string({
            required_error: 'Password is required',
            invalid_type_error: 'Password must be a string',
        })
        .min(8, 'Password must be at least 8 characters')
        .optional(),
    phone_number: z
        .string({
            required_error: 'Phone number is required',
            invalid_type_error: 'Phone number must be a string',
        })
        .min(10, 'Phone number must be at least 10 characters')
        .optional(),
    avatar: z
        .string({
            required_error: 'Avatar is required',
            invalid_type_error: 'Avatar must be a string',
        })
        .optional()
        .nullable(),
});

export class UpdateProfileDto {
    static schema: z.ZodObject<any> = updateProfileSchema;

    constructor(
        public name?: string,
        public email?: string,
        public phone_number?: string,
        public password?: string,
        public avatar?: string | null,
    ) {}
}
