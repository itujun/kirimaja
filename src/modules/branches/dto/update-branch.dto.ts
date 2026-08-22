import { ZodObject } from 'zod';
import { branchSchema } from './create-branch.dto';

const updateBranchSchema = branchSchema.partial(); // <- zod native equivalent dari "PartialType"

export class UpdateBranchDto {
    static schema: ZodObject<any> = updateBranchSchema;

    constructor(
        public readonly name?: string,
        public readonly address?: string,
        public readonly phone_number?: string,
    ) {}
}
