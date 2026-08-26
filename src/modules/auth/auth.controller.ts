import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    Res,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthLoginDTO } from './dto/auth-login.dto';
import { AuthRegisterDTO } from './dto/auth-register.dto';
import { UserResponse } from './response/auth-login.response';
import { JwtAuthGuard } from './guards/logged-in.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser } from './strategies/jwt.strategy';
import { BaseResponse } from '../roles/interface/base-response.interface';
import { Env } from 'src/config/env.schema';
import {
    ACCESS_TOKEN_COOKIE_NAME,
    buildAuthCookieOptions,
} from './constants/auth-cookie.constant';
import {
    CSRF_COOKIE_NAME,
    buildCsrfCookieOptions,
} from './constants/csrf-cookie.constant';
import {
    REFRESH_TOKEN_COOKIE_NAME,
    buildRefreshTokenCookieOptions,
} from './constants/refresh-token-cookie.constant';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private configService: ConfigService<Env, true>,
    ) {}

    @Post('login')
    async login(
        @Body() request: AuthLoginDTO,
        @Res({ passthrough: true }) response: Response,
    ): Promise<BaseResponse<UserResponse>> {
        const result = await this.authService.login(request);
        this.setAuthCookies(response, result.accessToken, result.refreshToken);
        return { message: 'Login successful', data: result.user };
    }

    @Post('register')
    async register(
        @Body() request: AuthRegisterDTO,
        @Res({ passthrough: true }) response: Response,
    ): Promise<BaseResponse<UserResponse>> {
        const result = await this.authService.register(request);
        this.setAuthCookies(response, result.accessToken, result.refreshToken);
        return { message: 'Registration successful', data: result.user };
    }

    // BARU. Dipanggil frontend saat access token expired (401). Tidak
    // pakai JwtAuthGuard SENGAJA -- justru dipanggil ketika access token
    // sudah tidak valid; otorisasinya lewat refresh_token cookie, bukan
    // access_token.
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response,
    ): Promise<BaseResponse<UserResponse>> {
        const rawRefreshToken = request.cookies?.[REFRESH_TOKEN_COOKIE_NAME] as
            | string
            | undefined;

        if (!rawRefreshToken) {
            throw new UnauthorizedException('Refresh token not found');
        }

        const result =
            await this.authService.rotateRefreshToken(rawRefreshToken);
        this.setAuthCookies(response, result.accessToken, result.refreshToken);

        return { message: 'Token refreshed successfully', data: result.user };
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response,
    ): Promise<BaseResponse<null>> {
        const rawRefreshToken = request.cookies?.[REFRESH_TOKEN_COOKIE_NAME] as
            | string
            | undefined;

        if (rawRefreshToken) {
            // Revoke di DB, bukan cuma hapus cookie -- kalau tidak,
            // refresh token yang sama tetap valid dipakai (mis. kalau
            // sempat dicuri sebelum logout) sampai masa berlakunya habis
            // sendiri (30 hari).
            await this.authService.revokeRefreshToken(rawRefreshToken);
        }

        response.clearCookie(
            ACCESS_TOKEN_COOKIE_NAME,
            buildAuthCookieOptions(this.configService),
        );
        response.clearCookie(
            CSRF_COOKIE_NAME,
            buildCsrfCookieOptions(this.configService),
        );
        response.clearCookie(
            REFRESH_TOKEN_COOKIE_NAME,
            buildRefreshTokenCookieOptions(this.configService),
        );

        return { message: 'Logout successful', data: null };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async me(
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<BaseResponse<UserResponse>> {
        return {
            message: 'Current user retrieved successfully',
            data: await this.authService.getCurrentUser(user.id),
        };
    }

    private setAuthCookies(
        response: Response,
        accessToken: string,
        refreshToken: string,
    ): void {
        response.cookie(
            ACCESS_TOKEN_COOKIE_NAME,
            accessToken,
            buildAuthCookieOptions(this.configService),
        );

        const csrfToken = randomBytes(32).toString('hex');
        response.cookie(
            CSRF_COOKIE_NAME,
            csrfToken,
            buildCsrfCookieOptions(this.configService),
        );

        response.cookie(
            REFRESH_TOKEN_COOKIE_NAME,
            refreshToken,
            buildRefreshTokenCookieOptions(this.configService),
        );
    }
}
