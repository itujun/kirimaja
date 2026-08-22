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
import { memoryStorage } from 'multer';
import {
    ALLOWED_AVATAR_MIME_TYPES,
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
            // memoryStorage (bukan diskStorage): file ditampung sebagai
            // Buffer di memory dulu, BELUM ditulis ke disk. Penulisan ke
            // disk baru dilakukan ProfileService setelah magic bytes-nya
            // divalidasi -- supaya file yang isinya tidak valid tidak
            // pernah sempat tersimpan ke disk sama sekali.
            storage: memoryStorage(),
            limits: { fileSize: MAX_AVATAR_SIZE_BYTES },
            // Ini HANYA filter cepat berdasarkan mimetype yang diklaim
            // client lewat header request -- gampang dipalsukan, jadi
            // BUKAN pengaman utama. Tujuannya cuma menolak lebih awal
            // file yang jelas-jelas salah, supaya tidak perlu dibaca
            // penuh ke memory dulu. Validasi yang sesungguhnya (baca
            // magic bytes dari isi file) terjadi di ProfileService,
            // lewat assertValidAvatarBuffer().
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
                avatar,
            ),
        };
    }

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
