import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Env } from 'src/config/env.schema';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
    imports: [
        PrismaModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService<Env, true>) => ({
                secret: configService.get('JWT_SECRET_KEY', { infer: true }),
                signOptions: {
                    expiresIn: configService.get('JWT_EXPIRES_IN', {
                        infer: true,
                    }),
                },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
