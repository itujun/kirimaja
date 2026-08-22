import {
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { unlink } from 'fs/promises';
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
        avatarFileName?: string | null,
    ): Promise<ProfileResponse> {
        // Ambil avatar LAMA sebelum update -- select minimal (id + avatar
        // saja), tidak perlu tarik seluruh kolom termasuk password hash
        // cuma untuk mengecek user ada atau tidak.
        const existingUser = await this.prismaService.user.findUnique({
            where: { id },
            select: { id: true, avatar: true },
        });

        if (!existingUser) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        // Prisma.UserUpdateInput dipakai (bukan `any`) supaya TypeScript
        // menolak saat compile kalau ada nama field yang salah ketik.
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

        if (avatarFileName) {
            updateData.avatar = `${AVATAR_URL_PREFIX}/${avatarFileName}`;
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
            // P2002 = unique constraint violation di Prisma -- di sini
            // artinya email baru sudah dipakai user lain. Tanpa ini,
            // client akan menerima 500 mentah tanpa pesan yang jelas.
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new ConflictException('Email is already in use');
            }
            throw error;
        }

        // File avatar lama BARU dihapus SETELAH update database sukses.
        // Urutan ini penting: kalau update gagal duluan, avatar lama tidak
        // ikut terhapus, sehingga data tidak pernah dalam keadaan
        // "hilang avatar tapi update sebenarnya gagal".
        if (avatarFileName && existingUser.avatar) {
            await this.deleteAvatarFile(existingUser.avatar);
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

    // Menghapus file avatar lama dari disk. Sengaja dibungkus try-catch
    // dan errornya diabaikan: kalau filenya sudah tidak ada (mis. terhapus
    // manual sebelumnya), itu bukan alasan untuk menggagalkan seluruh
    // request update profile yang sebenarnya sudah sukses di database.
    private async deleteAvatarFile(avatarUrl: string): Promise<void> {
        try {
            const filename = avatarUrl.split('/').pop();
            if (!filename) return;
            await unlink(join(AVATAR_UPLOAD_DIR, filename));
        } catch {
            // no-op: kegagalan hapus file lama bukan error fatal
        }
    }
}
