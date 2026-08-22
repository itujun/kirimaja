import { ZodObject } from 'zod';
import { employeeBranchSchema } from './create-employee-branch.dto';

const updateEmployeeBranchSchema = employeeBranchSchema.partial(); // <- zod native equivalent dari "PartialType"

export class UpdateEmployeeBranchDto {
    static schema: ZodObject<any> = updateEmployeeBranchSchema;

    constructor(
        public readonly name?: string,
        public readonly email?: string,
        public readonly phone_number?: string,
        public readonly branch_id?: number,
        public readonly type?: string,
        public readonly role_id?: number,
        public readonly password?: string,
        public readonly avatar?: string,
    ) {}
}
