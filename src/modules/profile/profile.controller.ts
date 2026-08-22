import {
    Controller,
    Get,
    Patch,
    UseGuards,
    Body,
    UseInterceptors,
    UploadedFile,
    UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/logged-in.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { BaseResponse } from '../roles/interface/base-response.interface';
import { ProfileResponse } from './response/profile.response';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
    ALLOWED_AVATAR_MIME_TYPES,
    AVATAR_UPLOAD_DIR,
    MAX_AVATAR_SIZE_BYTES,
} from './constants/avatar.constant';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
    constructor(private readonly profileService: ProfileService) {}

    @Get()
    async findOne(
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<BaseResponse<ProfileResponse>> {
        return {
            message: 'profile retrieved successfully',
            data: await this.profileService.findOne(user.id),
        };
    }

    @Patch()
    @UseInterceptors(
        FileInterceptor('avatar', {
            storage: diskStorage({
                destination: AVATAR_UPLOAD_DIR,
                filename: (req, file, cb) => {
                    const uniqueSuffix =
                        Date.now() + '-' + Math.round(Math.random() * 1e9);
                    cb(null, uniqueSuffix + extname(file.originalname));
                },
            }),
            // Tanpa ini, endpoint bisa disalahgunakan untuk upload file
            // raksasa berulang-ulang dan menghabiskan disk server.
            limits: { fileSize: MAX_AVATAR_SIZE_BYTES },
            // Cek MIME type asli file (bukan cuma ekstensi nama file yang
            // gampang dipalsukan), dan lempar HttpException bawaan Nest
            // (bukan `new Error(...)` generik) supaya response error-nya
            // konsisten -- 415 Unsupported Media Type, bukan 500 mentah.
            fileFilter: (req, file, cb) => {
                if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
                    return cb(
                        new UnsupportedMediaTypeException(
                            `Only image files are allowed (${ALLOWED_AVATAR_MIME_TYPES.join(', ')})`,
                        ),
                        false,
                    );
                }
                cb(null, true);
            },
        }),
    )
    async update(
        @CurrentUser() user: AuthenticatedUser,
        @Body() updateProfileDto: UpdateProfileDto,
        @UploadedFile() avatar: Express.Multer.File | undefined,
    ): Promise<BaseResponse<ProfileResponse>> {
        return {
            message: 'profile updated successfully',
            data: await this.profileService.update(
                user.id,
                updateProfileDto,
                avatar ? avatar.filename : null,
            ),
        };
    }

    // Endpoint terpisah khusus ganti password -- lihat alasan keamanannya
    // di ChangePasswordDto.
    @Patch('password')
    async changePassword(
        @CurrentUser() user: AuthenticatedUser,
        @Body() changePasswordDto: ChangePasswordDto,
    ): Promise<BaseResponse<null>> {
        await this.profileService.changePassword(user.id, changePasswordDto);
        return {
            message: 'password updated successfully',
        };
    }
}
