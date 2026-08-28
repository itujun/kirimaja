import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
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

        // FIX (root cause sebenarnya): skipDuplicates:true di Prisma untuk
        // MySQL selalu diterjemahkan jadi `INSERT IGNORE`, dan MySQL
        // sendiri mendokumentasikan bahwa INSERT IGNORE mengubah error
        // FOREIGN KEY CONSTRAINT jadi sekadar warning yang di-skip --
        // BUKAN exception. Artinya createMany() di bawah TIDAK PERNAH
        // melempar error walau permission_ids yang dikirim tidak valid;
        // dia cuma diam-diam insert 0 baris. $transaction saja tidak
        // cukup untuk mencegah ini karena tidak ada apapun yang perlu
        // di-rollback dari sudut pandang Prisma/MySQL -- makanya kita
        // validasi keberadaan semua permission_ids di awal, SEBELUM
        // deleteMany menyentuh data lama sama sekali.
        if (updateRoleDto.permission_ids.length > 0) {
            const existingPermissions =
                await this.prismaService.permission.findMany({
                    where: { id: { in: updateRoleDto.permission_ids } },
                    select: { id: true },
                });

            const existingIds = new Set(
                existingPermissions.map((permission) => permission.id),
            );
            const invalidIds = updateRoleDto.permission_ids.filter(
                (permissionId) => !existingIds.has(permissionId),
            );

            if (invalidIds.length > 0) {
                throw new BadRequestException(
                    `Permission ID tidak ditemukan: ${invalidIds.join(', ')}`,
                );
            }
        }

        // $transaction tetap dipertahankan: melindungi dari kegagalan
        // lain yang MEMANG melempar error (mis. koneksi DB putus di
        // tengah createMany) -- bukan lagi untuk kasus FK yang sudah
        // ditangani validasi di atas.
        await this.prismaService.$transaction(async (tx) => {
            await tx.rolePermission.deleteMany({
                where: { roleId: id },
            });

            if (updateRoleDto.permission_ids.length > 0) {
                const rolePermissions = updateRoleDto.permission_ids.map(
                    (permissionId) => ({
                        roleId: id,
                        permissionId: permissionId,
                    }),
                );

                await tx.rolePermission.createMany({
                    data: rolePermissions,
                    skipDuplicates: true,
                });
            }
        });

        return await this.findOne(id);
    }
}
