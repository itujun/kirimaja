import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { Env } from 'src/config/env.schema';
import { RoleResponse } from '../response/auth-login.response';
import { ROLE_WITH_PERMISSIONS_INCLUDE } from 'src/common/prisma/prisma-includes';

export interface JwtPayload {
    sub: number;
    email: string;
    name: string;
    roleId: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly prisma: PrismaService,
        configService: ConfigService<Env, true>,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
            role: RoleResponse.fromEntity(user.role), // sekarang bentuknya SAMA dengan response login
        };
    }
}
