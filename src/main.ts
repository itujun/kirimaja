import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ZodValidationPipe } from './common/pipes/zod.validation.pipe';
import { ResponseTransformInterceptor } from './common/interceptors/response.interceptor';
import { ConfigService } from '@nestjs/config';
import { Env } from './config/env.schema';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    app.useGlobalPipes(new ZodValidationPipe());
    app.useGlobalInterceptors(new ResponseTransformInterceptor());

    app.useStaticAssets('public');

    // ConfigService<Env, true> = strict mode, Typescript akan tahu persis
    // key apa saja yg valid dan tipe datanya
    const configService = app.get<ConfigService<Env, true>>(ConfigService);

    // FIX: sebelumnya origin memakai process.env.CORS_ORIGIN mentah --
    // variabel ini TIDAK terdaftar di env.schema.ts (tidak tervalidasi
    // Zod, tidak ada di .env.example), jadi selalu jatuh ke fallback '*'.
    // Dikombinasikan dengan credentials: true, itu kontradiksi menurut
    // spesifikasi CORS (browser akan menolak response yang butuh
    // kredensial kalau origin-nya wildcard '*').
    //
    // Aplikasi ini murni pakai JWT Bearer token di header Authorization,
    // tidak pernah pakai cookie di manapun -- jadi credentials: true
    // sebenarnya tidak pernah benar-benar dibutuhkan. FRONTEND_URL juga
    // sudah ada sebagai env variable yang required & tervalidasi (dipakai
    // juga di shipments.service.ts untuk redirect Xendit), jadi dipakai
    // ulang di sini sebagai satu-satunya sumber kebenaran "alamat
    // frontend saya", bukan bikin variabel CORS_ORIGIN baru yang terpisah.
    app.enableCors({
        origin: configService.get('FRONTEND_URL', { infer: true }),
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        allowedHeaders: 'Content-Type, Authorization',
        credentials: false,
    });

    const port = configService.get('PORT', { infer: true });

    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
