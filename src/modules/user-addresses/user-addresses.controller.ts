import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    UseInterceptors,
    UnsupportedMediaTypeException,
    UploadedFile,
    ParseIntPipe,
} from '@nestjs/common';
import { UserAddressesService } from './user-addresses.service';
import { CreateUserAddressesDto } from './dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';
import { JwtAuthGuard } from '../auth/guards/logged-in.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserAddress } from '@prisma/client';
import { BaseResponse } from '../roles/interface/base-response.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
    ALLOWED_ADDRESS_PHOTO_MIME_TYPES,
    MAX_ADDRESS_PHOTO_SIZE_BYTES,
} from './constants/address-photo.constant';

// Dipakai di create() DAN update() -- disatukan di sini biar konfigurasi
// upload untuk kedua endpoint selalu identik, tidak ada risiko salah satu
// endpoint ke-update sementara yang lain lupa di-sync.
const photoInterceptor = FileInterceptor('photo', {
    // memoryStorage: file ditampung sebagai Buffer dulu, BELUM ditulis ke
    // disk. Penulisan baru dilakukan UserAddressesService setelah magic
    // bytes-nya divalidasi (assertValidAddressPhotoBuffer).
    storage: memoryStorage(),
    limits: { fileSize: MAX_ADDRESS_PHOTO_SIZE_BYTES },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_ADDRESS_PHOTO_MIME_TYPES.includes(file.mimetype)) {
            return cb(
                new UnsupportedMediaTypeException(
                    `Only image files are allowed (${ALLOWED_ADDRESS_PHOTO_MIME_TYPES.join(', ')})`,
                ),
                false,
            );
        }
        cb(null, true);
    },
});

@Controller('user-addresses')
@UseGuards(JwtAuthGuard)
export class UserAddressesController {
    constructor(private readonly userAddressesService: UserAddressesService) {}

    @Post()
    @UseInterceptors(photoInterceptor)
    async create(
        @CurrentUser() user: AuthenticatedUser,
        @Body() createUserAddressDto: CreateUserAddressesDto,
        @UploadedFile() photo: Express.Multer.File | undefined,
    ): Promise<BaseResponse<UserAddress>> {
        return {
            message: 'user address created successfully',
            data: await this.userAddressesService.create(
                createUserAddressDto,
                user.id,
                photo,
            ),
        };
    }

    @Get()
    async findAll(
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<BaseResponse<UserAddress[]>> {
        return {
            message: 'user addresses found successfully',
            data: await this.userAddressesService.findAll(user.id),
        };
    }

    @Get(':id')
    async findOne(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<BaseResponse<UserAddress>> {
        return {
            message: `user address with ID ${id} found successfully`,
            data: await this.userAddressesService.findOne(id),
        };
    }

    @Patch(':id')
    @UseInterceptors(photoInterceptor)
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateUserAddressDto: UpdateUserAddressDto,
        @UploadedFile() photo: Express.Multer.File | undefined,
    ): Promise<BaseResponse<UserAddress>> {
        return {
            message: `user address with ID ${id} updated successfully`,
            data: await this.userAddressesService.update(
                id,
                updateUserAddressDto,
                photo,
            ),
        };
    }

    @Delete(':id')
    async remove(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<BaseResponse<void>> {
        await this.userAddressesService.remove(id);
        return {
            message: `user address with ID ${id} deleted successfully`,
            data: null,
        };
    }
}
