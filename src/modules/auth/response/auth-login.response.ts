import { Prisma } from '@prisma/client';
import { Expose, plainToInstance, Type } from 'class-transformer';

// Type ini menggambarkan bentuk data Role hasil query Prisma
// dengan include rolePermissions + permission (biar type-safe, bukan `any`)
type RoleWithPermissions = Prisma.RoleGetPayload<{
    include: {
        rolePermissions: {
            include: { permission: true };
        };
    };
}>;

export class RoleResponse {
    @Expose()
    id: number;

    @Expose()
    name: string;

    @Expose()
    key: string;

    @Expose()
    @Type(() => PermissionResponse)
    permissions: PermissionResponse[];

    // Satu-satunya tempat yang tahu cara "merapikan" data Role dari Prisma.
    // Semua service tinggal panggil ini, nggak perlu tulis ulang mapping-nya.
    static fromEntity(role: RoleWithPermissions): RoleResponse {
        return plainToInstance(
            RoleResponse,
            {
                id: role.id,
                name: role.name,
                key: role.key,
                permissions: role.rolePermissions.map((rp) => ({
                    id: rp.permission.id,
                    name: rp.permission.name,
                    key: rp.permission.key,
                    resource: rp.permission.resource,
                })),
            },
            { excludeExtraneousValues: true },
        );
    }
}

class PermissionResponse {
    @Expose()
    id: number;

    @Expose()
    name: string;

    @Expose()
    key: string;

    @Expose()
    resource: string;
}

export class UserResponse {
    @Expose()
    id: number;

    @Expose()
    email: string;

    @Expose()
    name: string;

    @Expose()
    avatar: string;

    @Expose()
    phoneNumber: string;

    // ⚠️ diubah dari `roles: RoleResponse[]` jadi `role: RoleResponse` (singular),
    // karena satu user memang cuma punya satu role
    @Expose()
    @Type(() => RoleResponse)
    role: RoleResponse;
}

export class AuthLoginResponse {
    @Expose()
    accessToken: string;

    @Expose()
    @Type(() => UserResponse)
    user: UserResponse;
}
