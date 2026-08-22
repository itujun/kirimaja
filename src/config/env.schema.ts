import { z } from 'zod';

export const envSchema = z.object({
    // Application
    NODE_ENV: z
        .enum(['development', 'test', 'production'])
        .default('development'),
    PORT: z.coerce.number().int().positive().default(3000),

    // Database
    DATABASE_URL: z
        .string({ required_error: 'DATABASE_URL wajib diisi di .env' })
        .min(1, 'DATABASE_URL tidak boleh kosong'),

    // JWT
    JWT_SECRET_KEY: z
        .string({ required_error: 'JWT_SECRET_KEY wajib diisi di .env' })
        .min(16, 'JWT_SECRET_KEY minimal 16 karakter demi keamanan'),
    JWT_EXPIRES_IN: z.coerce.number().int().positive().default(86400), // 1 day

    // OpenCageData
    OPENCAGE_API_KEY: z
        .string({ required_error: 'OPENCAGE_API_KEY wajib diisi di .env' })
        .min(1, 'OPENCAGE_API_KEY tidak boleh kosong'),
});
export type Env = z.infer<typeof envSchema>;
