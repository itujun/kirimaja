import { ConfigService } from '@nestjs/config';
import { CookieOptions } from 'express';
import { Env } from 'src/config/env.schema';

// Nama cookie disentralisasi di sini -- dipakai di 3 tempat (set di
// login/register, clear di logout, baca di JwtStrategy). Kalau suatu
// saat mau ganti nama, cukup ubah satu baris ini.
export const ACCESS_TOKEN_COOKIE_NAME = 'access_token';

// Opsi cookie disatukan di sini supaya set-cookie (login/register) dan
// clear-cookie (logout) SELALU pakai konfigurasi yang identik --
// browser tidak akan menghapus cookie kalau attribute path/domain/
// sameSite-nya berbeda dari saat cookie itu di-set.
export function buildAuthCookieOptions(
    configService: ConfigService<Env, true>,
): CookieOptions {
    const isProduction =
        configService.get('NODE_ENV', { infer: true }) === 'production';
    const jwtExpiresInSeconds = configService.get('JWT_EXPIRES_IN', {
        infer: true,
    });

    return {
        httpOnly: true, // JS di browser (document.cookie) TIDAK BISA baca ini -> mitigasi XSS
        secure: isProduction, // di production wajib true (cookie cuma dikirim lewat HTTPS)
        sameSite: 'lax', // cukup untuk proteksi CSRF dasar selama FE & BE same-site
        path: '/',
        maxAge: jwtExpiresInSeconds * 1000, // Env pakai detik, cookie maxAge pakai ms
    };
}
