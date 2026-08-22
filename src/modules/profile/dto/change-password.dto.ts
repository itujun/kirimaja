import { z, ZodEffects, ZodObject } from 'zod';

// Endpoint ganti password DIPISAH dari update profile umum, dan wajib
// menyertakan `current_password`. Alasan: kalau digabung ke satu endpoint
// tanpa verifikasi password lama, siapa pun yang berhasil mencuri/memakai
// JWT korban (mis. lewat XSS) bisa langsung mengambil alih akun secara
// permanen dengan mengganti password-nya -- tanpa pernah tahu password asli.
//
// `.refine()` dipakai untuk memastikan new_password & konfirmasinya sama
// PERSIS SEBELUM masuk ke service -- validasi ini menghasilkan ZodEffects,
// makanya tipe `schema` di sini ZodEffects<ZodObject<any>>, bukan ZodObject
// polos (lihat ZodValidationPipe.isZodSchema yang menerima keduanya).
const changePasswordSchema = z
    .object({
        current_password: z
            .string({
                required_error: 'Current password is required',
                invalid_type_error: 'Current password must be a string',
            })
            .min(1, 'Current password is required'),
        new_password: z
            .string({
                required_error: 'New password is required',
                invalid_type_error: 'New password must be a string',
            })
            .min(8, 'New password must be at least 8 characters')
            .max(20, 'New password cannot exceed 20 characters.'),
        new_password_confirmation: z.string({
            required_error: 'New password confirmation is required',
            invalid_type_error: 'New password confirmation must be a string',
        }),
    })
    .refine((data) => data.new_password === data.new_password_confirmation, {
        message: 'New password confirmation does not match',
        path: ['new_password_confirmation'],
    });

export class ChangePasswordDto {
    static schema: ZodEffects<ZodObject<any>> = changePasswordSchema;

    constructor(
        public current_password: string,
        public new_password: string,
        public new_password_confirmation: string,
    ) {}
}
