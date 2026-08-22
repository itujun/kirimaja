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
    avatar: z
        .string({
            required_error: 'Avatar is required',
            invalid_type_error: 'Avatar must be a string',
        })
        .optional()
        .nullable(),
});

export class UpdateProfileDto {}
