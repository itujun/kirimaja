import {
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ProfileResponse } from './response/profile.response';
import {
    AVATAR_UPLOAD_DIR,
    AVATAR_URL_PREFIX,
} from './constants/avatar.constant';
import { assertValidAvatarBuffer } from './utils/avatar-file-validator';

@Injectable()
export class ProfileService {
    constructor(private prismaService: PrismaService) {}

    async findOne(id: number): Promise<ProfileResponse> {
        const user = await this.prismaService.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                phoneNumber: true,
            },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return plainToInstance(ProfileResponse, user, {
            excludeExtraneousValues: true,
        });
    }

    async update(
        id: number,
        updateProfileDto: UpdateProfileDto,
        avatarFile?: Express.Multer.File,
    ): Promise<ProfileResponse> {
        const existingUser = await this.prismaService.user.findUnique({
            where: { id },
            select: { id: true, avatar: true },
        });

        if (!existingUser) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        const updateData: Prisma.UserUpdateInput = {};

        if (updateProfileDto.name) {
            updateData.name = updateProfileDto.name;
        }

        if (updateProfileDto.email) {
            updateData.email = updateProfileDto.email;
        }

        if (updateProfileDto.phone_number) {
            updateData.phoneNumber = updateProfileDto.phone_number;
        }

        // Kalau ada file avatar baru: validasi ISI file-nya (magic bytes)
        // dan simpan ke disk DI SINI, SEBELUM menyentuh database sama
        // sekali. Kalau isinya tidak valid, assertValidAvatarBuffer akan
        // throw UnsupportedMediaTypeException -- dan karena kita belum
        // menulis apa pun ke disk maupun database di titik ini, tidak ada
        // yang perlu di-rollback atau dibersihkan.
        let newAvatarFilename: string | undefined;
        if (avatarFile) {
            newAvatarFilename = await this.saveAvatarFile(avatarFile);
            updateData.avatar = `${AVATAR_URL_PREFIX}/${newAvatarFilename}`;
        }

        let updatedUser;
        try {
            updatedUser = await this.prismaService.user.update({
                where: { id },
                data: updateData,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    avatar: true,
                    phoneNumber: true,
                },
            });
        } catch (error) {
            // Update DB gagal (mis. email bentrok) PADAHAL avatar baru
            // sudah kadung ditulis ke disk beberapa baris di atas --
            // maka file yatim itu harus dihapus lagi supaya tidak
            // menumpuk sebagai sampah tak terpakai.
            if (newAvatarFilename) {
                await this.deleteAvatarFileByFilename(newAvatarFilename);
            }

            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new ConflictException('Email is already in use');
            }
            throw error;
        }

        // Baru di titik ini update DB dipastikan sukses -- aman untuk
        // menghapus avatar LAMA (kalau ada avatar baru yang menggantikannya).
        if (newAvatarFilename && existingUser.avatar) {
            await this.deleteAvatarFileByUrl(existingUser.avatar);
        }

        return plainToInstance(ProfileResponse, updatedUser, {
            excludeExtraneousValues: true,
        });
    }

    async changePassword(
        id: number,
        changePasswordDto: ChangePasswordDto,
    ): Promise<void> {
        const user = await this.prismaService.user.findUnique({
            where: { id },
            select: { id: true, password: true },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        const isCurrentPasswordValid = await bcrypt.compare(
            changePasswordDto.current_password,
            user.password,
        );

        if (!isCurrentPasswordValid) {
            throw new UnauthorizedException('Current password is incorrect');
        }

        const hashedPassword = await bcrypt.hash(
            changePasswordDto.new_password,
            10,
        );

        await this.prismaService.user.update({
            where: { id },
            data: { password: hashedPassword },
        });
    }

    // Validasi magic bytes lalu tulis buffer ke disk. Nama file dibuat
    // dari ekstensi hasil DETEKSI ISI FILE (detected.ext), BUKAN dari
    // originalname yang dikirim client -- ini sekaligus mencegah trik
    // nama file ganda semacam "foto.php.jpg" ikut menentukan ekstensi
    // file yang tersimpan di server.
    private async saveAvatarFile(file: Express.Multer.File): Promise<string> {
        const detected = await assertValidAvatarBuffer(file.buffer);

        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const filename = `${uniqueSuffix}.${detected.ext}`;

        // recursive: true -- aman dipanggil berkali-kali, tidak error
        // kalau foldernya sudah ada, dan otomatis membuat folder kalau
        // belum pernah dibuat sebelumnya (mis. deployment pertama kali).
        await mkdir(AVATAR_UPLOAD_DIR, { recursive: true });
        await writeFile(join(AVATAR_UPLOAD_DIR, filename), file.buffer);

        return filename;
    }

    private async deleteAvatarFileByFilename(filename: string): Promise<void> {
        try {
            await unlink(join(AVATAR_UPLOAD_DIR, filename));
        } catch {
            // no-op: kegagalan hapus file bukan error fatal
        }
    }

    private async deleteAvatarFileByUrl(avatarUrl: string): Promise<void> {
        const filename = avatarUrl.split('/').pop();
        if (!filename) return;
        await this.deleteAvatarFileByFilename(filename);
    }
}
