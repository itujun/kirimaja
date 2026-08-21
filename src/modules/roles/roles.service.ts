import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateRoleDTO } from './dto/update-role.dto';
import { RoleResponse } from '../auth/response/auth-login.response';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { ROLE_WITH_PERMISSIONS_INCLUDE } from 'src/common/prisma/prisma-includes';

@Injectable()
export class RolesService {
    constructor(private prismaService: PrismaService) {}

    async findAll(): Promise<RoleResponse[]> {
        const roles = await this.prismaService.role.findMany({
            include: ROLE_WITH_PERMISSIONS_INCLUDE,
        });

        return roles.map((role) => RoleResponse.fromEntity(role));
    }

    async findOne(id: number): Promise<RoleResponse> {
        const role = await this.prismaService.role.findUnique({
            where: { id },
            include: ROLE_WITH_PERMISSIONS_INCLUDE,
        });

        if (!role) {
            throw new NotFoundException(`Role with ID ${id} not found`);
        }

        return RoleResponse.fromEntity(role);
    }

    async update(
        id: number,
        updateRoleDto: UpdateRoleDTO,
    ): Promise<RoleResponse> {
        await this.findOne(id);

        await this.prismaService.rolePermission.deleteMany({
            where: { roleId: id },
        });

        if (updateRoleDto.permission_ids.length > 0) {
            const rolePermissions = updateRoleDto.permission_ids.map(
                (permissionId) => ({
                    roleId: id,
                    permissionId: permissionId,
                }),
            );

            await this.prismaService.rolePermission.createMany({
                data: rolePermissions,
                skipDuplicates: true,
            });
        }

        return await this.findOne(id);
    }
}
