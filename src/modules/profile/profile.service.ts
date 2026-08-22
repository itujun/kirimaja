import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { ProfileResponse } from './response/profile.response';
import { plainToInstance } from 'class-transformer';
import * as bcrypt from 'bcrypt';

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
        const user = await this.prismaService.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        const updateData: any = {};

        if (updateProfileDto.email) {
            updateData.email = updateProfileDto.email;
        }

        if (updateProfileDto.name) {
            updateData.name = updateProfileDto.name;
        }

        if (updateProfileDto.phone_number) {
            updateData.phoneNumber = updateProfileDto.phone_number;
        }

        if (avatarFileName) {
            updateData.avatar = `/uploads/avatar/${avatarFileName}`;
        }

        if (updateProfileDto.password) {
            const hashedPassword = await bcrypt.hash(
                updateProfileDto.password,
                10,
            );
            updateData.password = hashedPassword;
        }

        const updatedUser = await this.prismaService.user.update({
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

        return plainToInstance(ProfileResponse, updatedUser, {
            excludeExtraneousValues: true,
        });
    }
}
