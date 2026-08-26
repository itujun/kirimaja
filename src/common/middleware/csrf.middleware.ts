import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import {
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME,
} from 'src/modules/auth/constants/csrf-cookie.constant';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void {
        // GET/HEAD/OPTIONS tidak mengubah state di server -- secara
        // definisi CSRF hanya relevan untuk method yang mengubah data.
        if (!UNSAFE_METHODS.has(req.method)) {
            return next();
        }

        const cookieToken = req.cookies?.[CSRF_COOKIE_NAME] as
            | string
            | undefined;

        // Kalau cookie CSRF belum ada sama sekali (user belum pernah
        // login di browser ini), request ini toh akan ditolak duluan oleh
        // JwtAuthGuard karena access_token juga tidak ada. Middleware ini
        // cukup lewatkan saja, biar guard auth yang menangani pesan
        // errornya -- tidak perlu ForbiddenException ganda di sini.
        if (!cookieToken) {
            return next();
        }

        const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

        if (!headerToken || headerToken !== cookieToken) {
            throw new ForbiddenException('Invalid or missing CSRF token');
        }

        next();
    }
}
