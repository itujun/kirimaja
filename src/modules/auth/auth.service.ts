import {
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { AuthLoginDTO } from './dto/auth-login.dto';
import {
    AuthLoginResponse,
    RoleResponse,
    UserResponse,
} from './response/auth-login.response';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import { AuthRegisterDTO } from './dto/auth-register.dto';
import { ROLE_WITH_PERMISSIONS_INCLUDE } from 'src/common/prisma/prisma-includes';
import { Env } from 'src/config/env.schema';

export interface RefreshResult {
    accessToken: string;
    refreshToken: string;
    user: UserResponse;
}

@Injectable()
export class AuthService {
    constructor(
        private prismaService: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService<Env, true>,
    ) {}

    async login(request: AuthLoginDTO): Promise<AuthLoginResponse> {
        const user = await this.prismaService.user.findUnique({
            where: { email: request.email },
            include: {
                role: {
                    include: ROLE_WITH_PERMISSIONS_INCLUDE,
                },
            },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const isPasswordValid = await bcrypt.compare(
            request.password,
            user.password,
        );
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid password');
        }

        const accessToken = this.signAccessToken(user);
        const refreshToken = await this.issueRefreshToken(user.id);
        const userResponse = this.toUserResponse(user);

        return plainToInstance(
            AuthLoginResponse,
            { accessToken, refreshToken, user: userResponse },
            { excludeExtraneousValues: true },
        );
    }

    async register(request: AuthRegisterDTO): Promise<AuthLoginResponse> {
        const existingUser = await this.prismaService.user.findUnique({
            where: { email: request.email },
        });

        if (existingUser) {
            throw new ConflictException('User already exists');
        }

        const role = await this.prismaService.role.findFirst({
            where: { key: 'customer' },
        });

        if (!role) {
            throw new NotFoundException('Role not found');
        }

        const hashedPassword = await bcrypt.hash(request.password, 10);

        const user = await this.prismaService.user.create({
            data: {
                name: request.name,
                email: request.email,
                password: hashedPassword,
                phoneNumber: request.phone_number,
                roleId: role.id,
            },
            include: {
                role: {
                    include: ROLE_WITH_PERMISSIONS_INCLUDE,
                },
            },
        });

        const accessToken = this.signAccessToken(user);
        const refreshToken = await this.issueRefreshToken(user.id);
        const userResponse = this.toUserResponse(user);

        return plainToInstance(
            AuthLoginResponse,
            { accessToken, refreshToken, user: userResponse },
            { excludeExtraneousValues: true },
        );
    }

    async getCurrentUser(userId: number): Promise<UserResponse> {
        const user = await this.prismaService.user.findUnique({
            where: { id: userId },
            include: {
                role: {
                    include: ROLE_WITH_PERMISSIONS_INCLUDE,
                },
            },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        return this.toUserResponse(user);
    }

    // Dipanggil dari POST /auth/refresh. Ini yang melakukan ROTASI:
    // refresh token lama langsung di-revoke di sini, diganti yang baru.
    async rotateRefreshToken(rawToken: string): Promise<RefreshResult> {
        const tokenHash = this.hashToken(rawToken);
        const existing = await this.prismaService.refreshToken.findUnique({
            where: { tokenHash },
        });

        if (!existing) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        if (existing.revokedAt) {
            // Token yang SUDAH pernah di-rotate tapi dipakai lagi --
            // sinyal kuat token ini bocor & sudah dipakai pihak lain
            // sebelum kita sadari. Cabut SEMUA refresh token milik user
            // ini, bukan cuma yang ketahuan dipakai ulang, supaya sesi
            // yang bocor di manapun langsung mati.
            await this.prismaService.refreshToken.updateMany({
                where: { userId: existing.userId, revokedAt: null },
                data: { revokedAt: new Date() },
            });
            throw new UnauthorizedException(
                'Refresh token reuse detected, all sessions revoked',
            );
        }

        if (existing.expiresAt < new Date()) {
            throw new UnauthorizedException('Refresh token expired');
        }

        const user = await this.prismaService.user.findUnique({
            where: { id: existing.userId },
            include: {
                role: {
                    include: ROLE_WITH_PERMISSIONS_INCLUDE,
                },
            },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const accessToken = this.signAccessToken(user);
        const newRefreshToken = await this.issueRefreshToken(
            user.id,
            existing.id,
        );

        return {
            accessToken,
            refreshToken: newRefreshToken,
            user: this.toUserResponse(user),
        };
    }

    async revokeRefreshToken(rawToken: string): Promise<void> {
        const tokenHash = this.hashToken(rawToken);
        await this.prismaService.refreshToken.updateMany({
            where: { tokenHash, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }

    private signAccessToken(user: {
        id: number;
        email: string;
        name: string;
        roleId: number;
    }): string {
        return this.jwtService.sign({
            sub: user.id,
            email: user.email,
            name: user.name,
            roleId: user.roleId,
        });
    }

    private toUserResponse(user: {
        role: Parameters<typeof RoleResponse.fromEntity>[0];
        [key: string]: unknown;
    }): UserResponse {
        return plainToInstance(
            UserResponse,
            { ...user, role: RoleResponse.fromEntity(user.role) },
            { excludeExtraneousValues: true },
        );
    }

    private hashToken(rawToken: string): string {
        return createHash('sha256').update(rawToken).digest('hex');
    }

    // replacesId diisi kalau ini hasil ROTASI (bukan login pertama kali) --
    // dipakai untuk menandai token lama sebagai "digantikan oleh" token baru.
    private async issueRefreshToken(
        userId: number,
        replacesId?: number,
    ): Promise<string> {
        const rawToken = randomBytes(64).toString('hex');
        const refreshExpiresInSeconds = this.configService.get(
            'JWT_REFRESH_EXPIRES_IN',
            { infer: true },
        );
        const expiresAt = new Date(Date.now() + refreshExpiresInSeconds * 1000);

        const created = await this.prismaService.refreshToken.create({
            data: {
                userId,
                tokenHash: this.hashToken(rawToken),
                expiresAt,
            },
        });

        if (replacesId) {
            await this.prismaService.refreshToken.update({
                where: { id: replacesId },
                data: { revokedAt: new Date(), replacedById: created.id },
            });
        }

        return rawToken;
    }
}
