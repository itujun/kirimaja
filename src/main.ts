import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ZodValidationPipe } from './common/pipes/zod.validation.pipe';
import { ResponseTransformInterceptor } from './common/interceptors/response.interceptor';
import { ConfigService } from '@nestjs/config';
import { Env } from './config/env.schema';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';

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
        allowedHeaders: 'Content-Type, Authorization',
        credentials: true,
    });

    const port = configService.get('PORT', { infer: true });

    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
