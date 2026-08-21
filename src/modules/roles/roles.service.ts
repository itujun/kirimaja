import { Injectable } from '@nestjs/common';
import { UpdateRoleDTO } from './dto/update-role.dto';
import { RoleResponse } from '../auth/response/auth-login.response';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class RolesService {
    constructor(private prismaService: PrismaService) {}

    async findAll(): Promise<RoleResponse> {
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

    findOne(id: number) {
        return `This action returns a #${id} role`;
    }

    update(id: number, updateRoleDto: UpdateRoleDTO) {
        return `This action updates a #${id} role`;
    }
}
