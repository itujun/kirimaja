import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { OpenCageService } from 'src/common/opencage/opencage.service';
import { UserAddress } from '@prisma/client';

@Injectable()
export class UserAddressesService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly openCageService: OpenCageService,
    ) {}

    private readonly UPLOADS_PATH = '/uploads/photos/';

    private generatePhotoPath(filename?: string): string | null {
        return filename ? `${this.UPLOADS_PATH}${filename}` : null;
    }

    private async getCoordinatesFromAddress(address: string): Promise<{
        lat: number;
        lng: number;
    }> {
        return await this.openCageService.geocode(address);
    }

    async create(
        createUserAddressDto: CreateUserAddressDto,
        userId: number,
        photoFileName?: string | null,
    ): Promise<UserAddress> {
        const { lat, lng } = await this.getCoordinatesFromAddress(
            createUserAddressDto.address,
        );

        if (photoFileName) {
            createdUserAddressDto.photo = this.generatePhotoPath(photoFileName);
        }

        return this.prismaService.userAddress.create({
            data: {
                userId,
                address: createUserAddressDto.address,
                tag: createUserAddressDto.tag,
                label: createUserAddressDto.label,
                photo: createUserAddressDto.photo,
                latitude: lat,
                longitude: lng,
            },
        });
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

    async findOne(id: number): Promise<UserAddress> {
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
        if (!userAddress) {
            throw new NotFoundException(`UserAddress with ID ${id} not found`);
        }
        return userAddress;
    }

    update(id: number, updateUserAddressDto: UpdateUserAddressDto) {
        return `This action updates a #${id} userAddress`;
    }

    remove(id: number) {
        return `This action removes a #${id} userAddress`;
    }
}
