import { ConfigService } from '@nestjs/config';
import { CookieOptions } from 'express';
import { Env } from 'src/config/env.schema';

export const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

export function buildRefreshTokenCookieOptions(
    configService: ConfigService<Env, true>,
): CookieOptions {
    const isProduction =
        configService.get('NODE_ENV', { infer: true }) === 'production';
    const refreshExpiresInSeconds = configService.get(
        'JWT_REFRESH_EXPIRES_IN',
        { infer: true },
    );

    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        // Sengaja discope ke '/auth' saja, BUKAN '/' seperti access_token.
        // Ini kredensial paling sensitif di seluruh sistem (umurnya
        // paling panjang, dan bisa dipakai berkali-kali untuk menerbitkan
        // access token baru) -- tidak perlu ikut terkirim ke SETIAP
        // endpoint lain (branches, shipments, dst) yang sama sekali
        // tidak butuh dia.
        path: '/auth',
        maxAge: refreshExpiresInSeconds * 1000,
    };
}
