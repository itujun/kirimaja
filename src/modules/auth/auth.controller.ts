import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Res,
    UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
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
        this.setAuthCookie(response, result.accessToken);

        // accessToken SENGAJA tidak dikirim lagi di body -- token sudah
        // ada di cookie httpOnly, mengirimnya lagi di body cuma
        // memperbesar attack surface tanpa manfaat.
        return { message: 'Login successful', data: result.user };
    }

    @Post('register')
    async register(
        @Body() request: AuthRegisterDTO,
        @Res({ passthrough: true }) response: Response,
    ): Promise<BaseResponse<UserResponse>> {
        const result = await this.authService.register(request);
        this.setAuthCookie(response, result.accessToken);

        return { message: 'Registration successful', data: result.user };
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    logout(@Res({ passthrough: true }) response: Response): BaseResponse<null> {
        // clearCookie WAJIB dipanggil dengan opsi yang SAMA (path, sameSite,
        // secure) seperti waktu cookie di-set, kalau tidak browser tidak
        // akan mengenalinya sebagai cookie yang sama dan tidak akan dihapus.
        response.clearCookie(
            ACCESS_TOKEN_COOKIE_NAME,
            buildAuthCookieOptions(this.configService),
        );
        return { message: 'Logout successful', data: null };
    }

    // Endpoint BARU. Dipanggil frontend setiap kali app pertama kali
    // di-load (atau di-refresh) untuk tahu: apakah cookie yang tersimpan
    // di browser masih valid, dan siapa user-nya (lengkap dengan role +
    // permissions -- inilah yang tidak dimiliki GET /profile).
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

    private setAuthCookie(response: Response, accessToken: string): void {
        response.cookie(
            ACCESS_TOKEN_COOKIE_NAME,
            accessToken,
            buildAuthCookieOptions(this.configService),
        );
    }
}
