import { z, ZodObject } from 'zod';

export const employeeBranchSchema = z.object({
    name: z
        .string({
            required_error: 'name is required',
            invalid_type_error: 'name must be a string',
        })
        .min(1, 'name must be at least 1 characters'),
    email: z
        .string({
            required_error: 'email is required',
            invalid_type_error: 'email must be a string',
        })
        .min(1, 'email must be at least 1 characters'),
    phone_number: z
        .string({
            required_error: 'phone number is required',
            invalid_type_error: 'phone number must be a string',
        })
        .min(10, 'phone number must be at least 10 characters'),
    branch_id: z
        .number({
            required_error: 'branch id is required',
            invalid_type_error: 'branch id must be a number',
        })
        .int({
            message: 'branch id must be an integer',
        }),
    type: z.enum(['courier', 'admin'], {
        errorMap: () => ({ message: 'type must be courier or admin' }),
    }),
    role_id: z
        .number({
            required_error: 'role id is required',
            invalid_type_error: 'role id must be a number',
        })
        .int({
            message: 'role id must be an integer',
        }),
    password: z
        .string({
            required_error: 'password is required',
            invalid_type_error: 'password must be a string',
        })
        .min(8, 'password must be at least 8 characters')
        .max(20, 'password cannot exceed 20 characters.'),
    avatar: z.string().optional().nullable(),
});

export class CreateEmployeeBranchDto {
    static schema: ZodObject<any> = employeeBranchSchema;

    constructor(
        public name: string,
        public email: string,
        public phone_number: string,
        public branch_id: number,
        public type: string,
        public role_id: number,
        public password: string,
        public avatar?: string | null,
    ) {}
}
