import { z } from 'zod';

// Catatan: field `password` SENGAJA dihapus dari sini dan dipindah ke
// ChangePasswordDto + endpoint terpisah (PATCH /profile/password).
// Alasan keamanan: ganti password seharusnya tidak bisa "menumpang"
// di request update profile umum tanpa verifikasi password lama --
// lihat ChangePasswordDto untuk detailnya.
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
    phone_number: z
        .string({
            required_error: 'Phone number is required',
            invalid_type_error: 'Phone number must be a string',
        })
        .min(10, 'Phone number must be at least 10 characters')
        .optional(),
});

export class UpdateProfileDto {
    static schema: z.ZodObject<any> = updateProfileSchema;

    constructor(
        public name?: string,
        public email?: string,
        public phone_number?: string,
    ) {}
}
