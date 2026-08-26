import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { Env } from 'src/config/env.schema';
import { RoleResponse } from '../response/auth-login.response';
import { ROLE_WITH_PERMISSIONS_INCLUDE } from 'src/common/prisma/prisma-includes';
import { ACCESS_TOKEN_COOKIE_NAME } from '../constants/auth-cookie.constant';

export interface JwtPayload {
    sub: number;
    email: string;
    name: string;
    roleId: number;
}

export interface AuthenticatedUser {
    id: number;
    email: string;
    role: RoleResponse;
}

// Extractor kustom: sebelumnya token dibaca dari header
// `Authorization: Bearer <token>` lewat ExtractJwt.fromAuthHeaderAsBearerToken().
// Sekarang token ada di httpOnly cookie, jadi kita baca dari req.cookies
// (hasil parsing cookie-parser di main.ts) alih-alih dari header.
const extractFromCookie = (req: Request): string | null => {
    return req?.cookies?.[ACCESS_TOKEN_COOKIE_NAME] ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly prisma: PrismaService,
        configService: ConfigService<Env, true>,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([extractFromCookie]),
            secretOrKey: configService.get('JWT_SECRET_KEY', { infer: true }),
        });
    }

    async validate(payload: JwtPayload) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            include: {
                role: {
                    include: ROLE_WITH_PERMISSIONS_INCLUDE,
                },
            },
        });

        if (!user) {
            return null;
        }

        return {
            id: user.id,
            email: user.email,
            role: RoleResponse.fromEntity(user.role),
        };
    }
}
