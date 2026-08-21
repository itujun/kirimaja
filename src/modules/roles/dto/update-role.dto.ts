import { z } from 'zod';

const updateRoleSchema = z.object({
    permission_ids: z
        .array(
            z.number({
                required_error: 'Permission IDs is required',
                invalid_type_error:
                    'Permission ID must be an arrayy of numbers',
            }),
        )
        .nonempty({
            message: 'At least one permission ID must be provided',
        }),
});

export class UpdateRoleDTO {
    static schema: z.ZodObject<any> = updateRoleSchema;

    constructor(public permission_ids: number[]) {}
}
