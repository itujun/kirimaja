import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateRoleDTO } from './dto/update-role.dto';
import { RoleResponse } from '../auth/response/auth-login.response';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class RolesService {
    constructor(private prismaService: PrismaService) {}

    async findAll(): Promise<RoleResponse[]> {
        const roles = await this.prismaService.role.findMany({
            include: {
                rolePermissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });

        return roles.map((role) => {
            return {
                id: role.id,
                name: role.name,
                key: role.key,
                permissions: role.rolePermissions.map((rp) => ({
                    id: rp.permission.id,
                    name: rp.permission.name,
                    key: rp.permission.key,
                    resource: rp.permission.resource,
                })),
            };
        });
    }

    async findOne(id: number): Promise<RoleResponse> {
        const role = await this.prismaService.role.findUnique({
            where: { id },
            include: {
                rolePermissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });

        if (!role) {
            throw new NotFoundException(`Role with ID ${id} not found`);
        }

        return {
            id: role.id,
            name: role.name,
            key: role.key,
            permissions: role.rolePermissions.map((rp) => ({
                id: rp.permission.id,
                name: rp.permission.name,
                key: rp.permission.key,
                resource: rp.permission.resource,
            })),
        };
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
