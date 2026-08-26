import { ConfigService } from '@nestjs/config';
import { CookieOptions } from 'express';
import { Env } from 'src/config/env.schema';

export const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
export const CSRF_HEADER_NAME = 'x-xsrf-token';

export function buildCsrfCookieOptions(
    configService: ConfigService<Env, true>,
): CookieOptions {
    const isProduction =
        configService.get('NODE_ENV', { infer: true }) === 'production';

    // Umur cookie CSRF SENGAJA disamakan dengan umur refresh token (bukan
    // access token yang pendek) -- supaya proteksi ini tetap aktif
    // sepanjang sesi user, bahkan setelah access token di-refresh
    // berkali-kali.
    const refreshExpiresInSeconds = configService.get(
        'JWT_REFRESH_EXPIRES_IN',
        { infer: true },
    );

    return {
        // SENGAJA false -- ini satu-satunya cookie auth yang MEMANG harus
        // bisa dibaca JavaScript. Bukan rahasia yang perlu disembunyikan
        // dari script kita sendiri, cuma perlu tidak bisa dipalsukan oleh
        // SITUS LAIN (dan itu sudah dijamin Same-Origin Policy browser).
        httpOnly: false,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: refreshExpiresInSeconds * 1000,
    };
}
