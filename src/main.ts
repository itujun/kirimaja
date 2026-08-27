import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ZodValidationPipe } from './common/pipes/zod.validation.pipe';
import { ResponseTransformInterceptor } from './common/interceptors/response.interceptor';
import { ConfigService } from '@nestjs/config';
import { Env } from './config/env.schema';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import { CSRF_HEADER_NAME } from './modules/auth/constants/csrf-cookie.constant';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    app.useGlobalPipes(new ZodValidationPipe());
    app.useGlobalInterceptors(new ResponseTransformInterceptor());

    app.useStaticAssets('public');

    // WAJIB sebelum request masuk ke controller manapun -- middleware ini
    // yang mem-parsing header `Cookie: access_token=xxx` dari request
    // menjadi object `req.cookies`, yang nanti dibaca oleh JwtStrategy.
    app.use(cookieParser());

    const configService = app.get<ConfigService<Env, true>>(ConfigService);

    // UPDATE dari sesi sebelumnya: dulu credentials di-set `false` karena
    // aplikasi murni pakai Bearer token di header (tidak butuh cookie).
    // Sekarang auth token disimpan sebagai httpOnly cookie, jadi
    // credentials WAJIB `true` -- ini yang mengizinkan browser
    // menyertakan & menerima cookie pada request cross-origin (FE beda
    // port dari BE). Tanpa ini, browser akan DIAM-DIAM tidak mengirim
    // ataupun menyimpan cookie dari response, walau tidak ada error yang
    // jelas di console -- salah satu bug paling membingungkan untuk
    // di-debug kalau belum tahu penyebabnya.
    app.enableCors({
        origin: configService.get('FRONTEND_URL', { infer: true }),
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        // TAMBAHAN: CSRF_HEADER_NAME ('x-xsrf-token') WAJIB ada di sini.
        // Header ini bukan header "safelisted" bawaan browser, jadi
        // request cross-origin yang membawanya otomatis jadi
        // "preflighted request" (browser kirim OPTIONS dulu). Kalau
        // header ini tidak di-whitelist di allowedHeaders, browser akan
        // MENOLAK mengirim request aslinya sama sekali dan muncul
        // sebagai "CORS error" di DevTools -- bukan 403 dari
        // CsrfMiddleware, karena request-nya bahkan belum sempat sampai
        // ke server. Import dari constant yang sama dipakai
        // CsrfMiddleware, supaya nama header tidak pernah drift antara
        // dua tempat ini.
        allowedHeaders: `Content-Type, Authorization, ${CSRF_HEADER_NAME}`,
        credentials: true,
    });

    const port = configService.get('PORT', { infer: true });

    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
