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
    Req,
    UploadedFile,
    ParseIntPipe,
} from '@nestjs/common';
import { UserAddressesService } from './user-addresses.service';
import { CreateUserAddressesDto } from './dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';
import { JwtAuthGuard } from '../auth/guards/logged-in.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ALLOWED_AVATAR_MIME_TYPES,
    MAX_AVATAR_SIZE_BYTES,
} from '../profile/constants/avatar.constant';
import { memoryStorage } from 'multer';
import { Request } from 'express';
import { UserAddress } from '@prisma/client';
import { BaseResponse } from '../roles/interface/base-response.interface';

@Controller('user-addresses')
@UseGuards(JwtAuthGuard)
export class UserAddressesController {
    constructor(private readonly userAddressesService: UserAddressesService) {}

    @Post()
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
    async create(
        @Body() createUserAddressDto: CreateUserAddressesDto,
        @Req() req: Request & { user?: any },
        @UploadedFile() photo: Express.Multer.File | undefined,
    ): Promise<BaseResponse<UserAddress>> {
        return {
            message: 'user address created successfully',
            data: await this.userAddressesService.create(
                createUserAddressDto,
                req.user.id,
                photo ? photo.filename : null,
            ),
        };
    }

    @Get()
    async findAll(
        @Req() req: Request & { user?: any },
    ): Promise<BaseResponse<UserAddress[]>> {
        return {
            message: 'user addresses found successfully',
            data: await this.userAddressesService.findAll(req.user.id),
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
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateUserAddressDto: UpdateUserAddressDto,
    ): Promise<BaseResponse<UserAddress>> {
        return {
            message: `user address with ID ${id} updated successfully`,
            data: await this.userAddressesService.update(
                id,
                updateUserAddressDto,
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
