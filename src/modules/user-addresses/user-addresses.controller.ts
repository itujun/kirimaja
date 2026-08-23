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

const photoInterceptor = FileInterceptor('photo', {
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
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', ParseIntPipe) id: number,
    ): Promise<BaseResponse<UserAddress>> {
        return {
            message: `user address with ID ${id} found successfully`,
            data: await this.userAddressesService.findOne(id, user.id),
        };
    }

    @Patch(':id')
    @UseInterceptors(photoInterceptor)
    async update(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', ParseIntPipe) id: number,
        @Body() updateUserAddressDto: UpdateUserAddressDto,
        @UploadedFile() photo: Express.Multer.File | undefined,
    ): Promise<BaseResponse<UserAddress>> {
        return {
            message: `user address with ID ${id} updated successfully`,
            data: await this.userAddressesService.update(
                id,
                user.id,
                updateUserAddressDto,
                photo,
            ),
        };
    }

    @Delete(':id')
    async remove(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', ParseIntPipe) id: number,
    ): Promise<BaseResponse<void>> {
        await this.userAddressesService.remove(id, user.id);
        return {
            message: `user address with ID ${id} deleted successfully`,
            data: null,
        };
    }
}
