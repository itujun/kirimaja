import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { Env } from 'src/config/env.schema';

@Injectable()
export class XenditWebhookGuard implements CanActivate {
    constructor(private readonly configService: ConfigService<Env, true>) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        const receivedToken = request.headers['x-callback-token'];
        const expectedToken = this.configService.get('XENDIT_CALLBACK_TOKEN');

        if (typeof receivedToken !== 'string' || receivedToken.length === 0) {
            throw new UnauthorizedException(
                'Missing webhook verification token',
            );
        }

        const receivedBuffer = Buffer.from(receivedToken);
        const expectedBuffer = Buffer.from(expectedToken);

        // timingSafeEqual akan throw kalau panjang buffer beda, jadi
        // panjang harus dicek duluan SEBELUM memanggilnya -- bukan cuma
        // soal menghindari crash, tapi juga supaya perbandingan panjang
        // itu sendiri tidak jadi celah timing baru (di sini aman karena
        // membandingkan panjang integer itu operasi O(1), beda dari
        // membandingkan isi string karakter demi karakter).
        const isValid =
            receivedBuffer.length === expectedBuffer.length &&
            timingSafeEqual(receivedBuffer, expectedBuffer);

        if (!isValid) {
            throw new UnauthorizedException(
                'Invalid webhook verification token',
            );
        }

        return true;
    }
}
