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
    const port = configService.get('PORT', { infer: true });

    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
