import { Injectable, NotFoundException } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { CreateUserAddressesDto } from './dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { OpenCageService } from 'src/common/opencage/opencage.service';
import { UserAddress } from '@prisma/client';
import {
    ADDRESS_PHOTO_UPLOAD_DIR,
    ADDRESS_PHOTO_URL_PREFIX,
} from './constants/address-photo.constant';
import { assertValidAddressPhotoBuffer } from './utils/address-photo-file-validator';

@Injectable()
export class UserAddressesService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly openCageService: OpenCageService,
    ) {}

    private async getCoordinatesFromAddress(
        address: string,
    ): Promise<{ lat: number; lng: number }> {
        return await this.openCageService.geocode(address);
    }

    async create(
        createUserAddressDto: CreateUserAddressesDto,
        userId: number,
        photoFile?: Express.Multer.File,
    ): Promise<UserAddress> {
        const { lat, lng } = await this.getCoordinatesFromAddress(
            createUserAddressDto.address,
        );

        let newPhotoFilename: string | undefined;
        if (photoFile) {
            newPhotoFilename = await this.savePhotoFile(photoFile);
        }

        try {
            return await this.prismaService.userAddress.create({
                data: {
                    userId,
                    address: createUserAddressDto.address,
                    tag: createUserAddressDto.tag,
                    label: createUserAddressDto.label,
                    photo: newPhotoFilename
                        ? `${ADDRESS_PHOTO_URL_PREFIX}/${newPhotoFilename}`
                        : null,
                    latitude: lat,
                    longitude: lng,
                },
            });
        } catch (error) {
            if (newPhotoFilename) {
                await this.deletePhotoFileByFilename(newPhotoFilename);
            }
            throw error;
        }
    }

    async findAll(userId: number): Promise<UserAddress[]> {
        return await this.prismaService.userAddress.findMany({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phoneNumber: true,
                        avatar: true,
                    },
                },
            },
        });
    }

    // `userId` WAJIB diisi dari @CurrentUser() di controller. Tanpa ini,
    // user A bisa akses/ubah/hapus address milik user B hanya dengan
    // menebak `id` di URL (IDOR -- Insecure Direct Object Reference).
    async findOne(id: number, userId: number): Promise<UserAddress> {
        const userAddress = await this.prismaService.userAddress.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phoneNumber: true,
                        avatar: true,
                    },
                },
            },
        });

        // Sengaja 404 untuk KEDUA kasus (tidak ada / bukan milik user
        // ini) -- bukan 403 untuk kasus kedua. Kalau dibedakan, client
        // bisa membedakan "id tidak ada" vs "id ada tapi punya orang
        // lain", yang berarti bocor info untuk menebak id valid di DB.
        if (!userAddress || userAddress.userId !== userId) {
            throw new NotFoundException(`UserAddress with ID ${id} not found`);
        }

        return userAddress;
    }

    async update(
        id: number,
        userId: number,
        updateUserAddressDto: UpdateUserAddressDto,
        photoFile?: Express.Multer.File,
    ): Promise<UserAddress> {
        const existing = await this.findOne(id, userId);

        let newLatitude = existing.latitude;
        let newLongitude = existing.longitude;

        if (updateUserAddressDto.address) {
            const { lat, lng } = await this.getCoordinatesFromAddress(
                updateUserAddressDto.address,
            );
            newLatitude = lat;
            newLongitude = lng;
        }

        let newPhotoFilename: string | undefined;
        let newPhotoUrl: string | undefined;
        if (photoFile) {
            newPhotoFilename = await this.savePhotoFile(photoFile);
            newPhotoUrl = `${ADDRESS_PHOTO_URL_PREFIX}/${newPhotoFilename}`;
        }

        let updated: UserAddress;
        try {
            updated = await this.prismaService.userAddress.update({
                where: { id },
                data: {
                    address: updateUserAddressDto.address ?? existing.address,
                    tag: updateUserAddressDto.tag ?? existing.tag,
                    label: updateUserAddressDto.label ?? existing.label,
                    photo: newPhotoUrl ?? existing.photo,
                    latitude: newLatitude,
                    longitude: newLongitude,
                },
            });
        } catch (error) {
            if (newPhotoFilename) {
                await this.deletePhotoFileByFilename(newPhotoFilename);
            }
            throw error;
        }

        if (newPhotoFilename && existing.photo) {
            await this.deletePhotoFileByUrl(existing.photo);
        }

        return updated;
    }

    async remove(id: number, userId: number): Promise<void> {
        const existing = await this.findOne(id, userId);
        await this.prismaService.userAddress.delete({ where: { id } });

        if (existing.photo) {
            await this.deletePhotoFileByUrl(existing.photo);
        }
    }

    private async savePhotoFile(file: Express.Multer.File): Promise<string> {
        const detected = await assertValidAddressPhotoBuffer(file.buffer);

        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const filename = `${uniqueSuffix}.${detected.ext}`;

        await mkdir(ADDRESS_PHOTO_UPLOAD_DIR, { recursive: true });
        await writeFile(join(ADDRESS_PHOTO_UPLOAD_DIR, filename), file.buffer);

        return filename;
    }

    private async deletePhotoFileByFilename(filename: string): Promise<void> {
        try {
            await unlink(join(ADDRESS_PHOTO_UPLOAD_DIR, filename));
        } catch {
            // no-op: kegagalan hapus file bukan error fatal
        }
    }

    private async deletePhotoFileByUrl(photoUrl: string): Promise<void> {
        const filename = photoUrl.split('/').pop();
        if (!filename) return;
        await this.deletePhotoFileByFilename(filename);
    }
}
