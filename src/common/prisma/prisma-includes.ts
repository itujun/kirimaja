import { Prisma } from '@prisma/client';

// Single source of truth untuk struktur include "Role + relasi permission-nya".
// Dipakai di RolesService, PermissionsService, AuthService, dan JwtStrategy
// supaya bentuk query-nya selalu konsisten di semua tempat.
//
// Prisma.validator memastikan TypeScript memvalidasi objek ini sesuai
// skema Prisma yang sebenarnya (Prisma.RoleInclude) -- kalau kamu salah
// tulis nama relasi, error akan muncul saat compile, bukan saat runtime.
export const ROLE_WITH_PERMISSIONS_INCLUDE =
    Prisma.validator<Prisma.RoleInclude>()({
        rolePermissions: {
            include: { permission: true },
        },
    });

// Tipe hasil query Role dengan include di atas, diturunkan otomatis
// (tidak perlu ditulis manual, dan selalu sinkron dengan include-nya)
export type RoleWithPermissions = Prisma.RoleGetPayload<{
    include: typeof ROLE_WITH_PERMISSIONS_INCLUDE;
}>;
