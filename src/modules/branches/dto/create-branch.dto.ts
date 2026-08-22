import { z, ZodObject } from 'zod';

export const branchSchema = z.object({
    name: z
        .string({
            required_error: 'Branch name is required',
            invalid_type_error: 'Branch name must be a string',
        })
        .min(1, 'Branch name must be at least 1 characters'),
    address: z
        .string({
            required_error: 'Branch address is required',
            invalid_type_error: 'Branch address must be a string',
        })
        .min(1, 'Branch address must be at least 1 characters'),
    phone_number: z
        .string({
            required_error: 'Branch phone number is required',
            invalid_type_error: 'Branch phone number must be a string',
        })
        .min(10, 'Branch phone number must be at least 10 characters'),
});

export class CreateBranchDto {
    static schema: ZodObject<any> = branchSchema;

    constructor(
        public readonly name: string,
        public readonly address: string,
        public readonly phone_number: string,
    ) {}
}
