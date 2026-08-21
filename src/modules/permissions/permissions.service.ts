import { Injectable, NotFoundException } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

const ROLE_WITH_PERMISSIONS_INCLUDE = {
    rolePermissions: {
        include: { permission: true },
    },
};

@Injectable()
export class PermissionsService {
    constructor(private prismaService: PrismaService) {}
    async findAll(): Promise<Permission[]> {
        return await this.prismaService.permission.findMany();
    }

    async getUserPermissions(userId: number): Promise<string[]> {
        const user = await this.prismaService.user.findUnique({
            where: { id: userId },
            include: {
                role: {
                    include: ROLE_WITH_PERMISSIONS_INCLUDE,
                },
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return (
            user.role?.rolePermissions.map(
                (rolePermission) => rolePermission.permission.key,
            ) || []
        );
    }

    async userHasAnyPermission(
        userId: number,
        permissions: string[],
    ): Promise<boolean> {
        const userPermissions = await this.getUserPermissions(userId);
        return permissions.some((permission) =>
            userPermissions.includes(permission),
        );
    }

    async userHasAllPermission(
        userId: number,
        permissions: string[],
    ): Promise<boolean> {
        const userPermissions = await this.getUserPermissions(userId);
        return permissions.every((permission) =>
            userPermissions.includes(permission),
        );
    }
}
