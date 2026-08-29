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
        .min(1, 'email is required')
        // FIX: sebelumnya cuma .min(1) -- string apapun yang tidak kosong
        // lolos sebagai "email", padahal auth-register.dto.ts (jalur
        // pendaftaran user lainnya) sudah pakai .email(). Endpoint ini
        // juga membuat User baru (lihat create() di service), jadi harus
        // konsisten validasinya.
        .email('email must be a valid email address'),
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
    // FIX (Critical -- privilege escalation): `role_id` SENGAJA dihapus
    // dari schema/DTO ini. Sebelumnya field ini diterima langsung dari
    // client dan dipakai apa adanya untuk membuat User baru -- backend
    // cuma cek ID itu ADA di tabel Role, tidak cek apakah role itu
    // PANTAS untuk `type` yang dipilih. Karena role admin-branch sendiri
    // sudah punya permission `employee.create`, siapapun dengan akun
    // admin-branch bisa mengirim role_id Super Admin lewat request
    // manual (Postman/curl) dan backend akan menerimanya begitu saja.
    // Sekarang role SELALU ditentukan di service (resolveRoleIdForType)
    // berdasarkan `type` + role milik requester, bukan dari input client.
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
        public password: string,
        public avatar?: string | null,
    ) {}
}
